import { sql, count, eq, and, gte, lte } from 'drizzle-orm';
import { withRLSContext } from '@/lib/database/rls-client';
import { objectives, initiatives, activities, profiles } from '@/db/okr-schema';
import { usersSyncInNeonAuth } from '@/db/neon_auth_schema';

/**
 * OKR Dashboard Statistics
 */
export interface OKRDashboardStats {
  totalObjectives: number;
  activeObjectives: number;
  completedObjectives: number;
  objectivesProgress: number;

  totalInitiatives: number;
  activeInitiatives: number;
  blockedInitiatives: number;
  initiativesProgress: number;

  totalActivities: number;
  pendingActivities: number;
  completedActivities: number;
  overdueActivities: number;

  teamMembers: number;
  daysToDeadline: number | null;

  overallProgress: number;
}

/**
 * Fetches aggregated statistics for the OKR Dashboard
 *
 * Aggregates data from:
 * - Objectives: total, active, completed, average progress
 * - Initiatives: total, active, blocked, average progress
 * - Activities: total, pending, completed, overdue count
 * - Profiles: active team member count
 * - Time: days remaining to nearest deadline
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @returns Complete dashboard statistics
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const stats = await getOKRDashboardStats(user.id);
 * console.log(`Total objectives: ${stats.totalObjectives}`);
 * ```
 */
export async function getOKRDashboardStats(
  userId: string
): Promise<OKRDashboardStats> {
  return withRLSContext(userId, async (db) => {
    // Aggregate objectives statistics
    const objectiveStats = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${objectives.status} = 'in_progress')::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${objectives.status} = 'completed')::int`,
        avgProgress: sql<string>`COALESCE(AVG(CAST(${objectives.progressPercentage} AS NUMERIC)), 0)`,
      })
      .from(objectives);

    // Aggregate initiatives statistics
    const initiativeStats = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE ${initiatives.status} = 'in_progress')::int`,
        blocked: sql<number>`COUNT(*) FILTER (WHERE ${initiatives.status} = 'cancelled')::int`,
        avgProgress: sql<string>`COALESCE(AVG(CAST(${initiatives.progressPercentage} AS NUMERIC)), 0)`,
      })
      .from(initiatives);

    // Aggregate activities statistics
    const activityStats = await db
      .select({
        total: count(),
        pending: sql<number>`COUNT(*) FILTER (WHERE ${activities.status} = 'todo')::int`,
        completed: sql<number>`COUNT(*) FILTER (WHERE ${activities.status} = 'completed')::int`,
        overdue: sql<number>`COUNT(*) FILTER (WHERE ${activities.dueDate} < NOW() AND ${activities.status} != 'completed')::int`,
      })
      .from(activities);

    // Get team members count
    const teamStats = await db
      .select({
        activeMembers: count(),
      })
      .from(profiles);

    // Calculate days to nearest deadline
    const nextDeadline = await db
      .select({
        daysRemaining: sql<number>`EXTRACT(DAY FROM (MIN(${objectives.endDate}) - NOW()))::int`,
      })
      .from(objectives)
      .where(
        sql`${objectives.status} != 'completed' AND ${objectives.endDate} > NOW()`
      );

    const objStats = objectiveStats[0] || {
      total: 0,
      active: 0,
      completed: 0,
      avgProgress: '0',
    };
    const initStats = initiativeStats[0] || {
      total: 0,
      active: 0,
      blocked: 0,
      avgProgress: '0',
    };
    const actStats = activityStats[0] || {
      total: 0,
      pending: 0,
      completed: 0,
      overdue: 0,
    };
    const teamCount = teamStats[0] || { activeMembers: 0 };
    const deadline = nextDeadline[0] || { daysRemaining: null };

    return {
      totalObjectives: objStats.total,
      activeObjectives: objStats.active,
      completedObjectives: objStats.completed,
      objectivesProgress: Math.round(parseFloat(objStats.avgProgress)),

      totalInitiatives: initStats.total,
      activeInitiatives: initStats.active,
      blockedInitiatives: initStats.blocked,
      initiativesProgress: Math.round(parseFloat(initStats.avgProgress)),

      totalActivities: actStats.total,
      pendingActivities: actStats.pending,
      completedActivities: actStats.completed,
      overdueActivities: actStats.overdue,

      teamMembers: teamCount.activeMembers,
      daysToDeadline: deadline.daysRemaining,

      overallProgress: Math.round(
        (parseFloat(objStats.avgProgress) + parseFloat(initStats.avgProgress)) /
          2
      ),
    };
  });
}

/**
 * Department Progress Analytics
 */
export interface DepartmentProgress {
  departmentName: string;
  totalObjectives: number;
  completedObjectives: number;
  completionRate: number;
}

/**
 * Fetches department-level progress statistics
 *
 * Aggregates objectives by department and calculates completion rates.
 * Returns departments ordered by completion rate (highest first).
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @returns Array of department progress metrics
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const deptProgress = await getDepartmentProgress(user.id);
 * console.log(`${deptProgress[0].departmentName}: ${deptProgress[0].completionRate}%`);
 * ```
 */
export async function getDepartmentProgress(
  userId: string
): Promise<DepartmentProgress[]> {
  return withRLSContext(userId, async (db) => {
    const results = await db
      .select({
        departmentName: objectives.department,
        totalObjectives: count(),
        completedObjectives: sql<number>`COUNT(*) FILTER (WHERE ${objectives.status} = 'completed')::int`,
        completionRate: sql<number>`
          CASE
            WHEN COUNT(*) > 0 THEN
              ROUND((COUNT(*) FILTER (WHERE ${objectives.status} = 'completed')::NUMERIC / COUNT(*)) * 100)
            ELSE 0
          END::int
        `,
      })
      .from(objectives)
      .groupBy(objectives.department)
      .orderBy(sql`completion_rate DESC`);

    return results.map((row) => ({
      departmentName: row.departmentName,
      totalObjectives: row.totalObjectives,
      completedObjectives: row.completedObjectives,
      completionRate: row.completionRate,
    }));
  });
}

/**
 * Top Performer Analytics
 */
export interface TopPerformer {
  userId: string;
  userName: string;
  completedCount: number;
  activeCount: number;
}

/**
 * Fetches top performers based on completed work items
 *
 * Aggregates completed and active initiatives/activities per user.
 * Returns top N users ordered by completion count.
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @param limit - Maximum number of performers to return (default: 5)
 * @returns Array of top performers with their statistics
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const topPerformers = await getTopPerformers(user.id, 5);
 * console.log(`Top performer: ${topPerformers[0].userName} with ${topPerformers[0].completedCount} completions`);
 * ```
 */
export async function getTopPerformers(
  userId: string,
  limit: number = 5
): Promise<TopPerformer[]> {
  return withRLSContext(userId, async (db) => {
    // Get completed initiatives count per user
    const initiativeCompletions = await db
      .select({
        userId: initiatives.assignedTo,
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${initiatives.status} = 'completed')::int`,
        activeCount: sql<number>`COUNT(*) FILTER (WHERE ${initiatives.status} = 'in_progress')::int`,
      })
      .from(initiatives)
      .where(sql`${initiatives.assignedTo} IS NOT NULL`)
      .groupBy(initiatives.assignedTo);

    // Get completed activities count per user
    const activityCompletions = await db
      .select({
        userId: activities.assignedTo,
        completedCount: sql<number>`COUNT(*) FILTER (WHERE ${activities.status} = 'completed')::int`,
        activeCount: sql<number>`COUNT(*) FILTER (WHERE ${activities.status} = 'in_progress')::int`,
      })
      .from(activities)
      .where(sql`${activities.assignedTo} IS NOT NULL`)
      .groupBy(activities.assignedTo);

    // Combine and aggregate results
    const userStatsMap = new Map<string, { completed: number; active: number }>();

    for (const init of initiativeCompletions) {
      if (init.userId) {
        const existing = userStatsMap.get(init.userId) || { completed: 0, active: 0 };
        userStatsMap.set(init.userId, {
          completed: existing.completed + init.completedCount,
          active: existing.active + init.activeCount,
        });
      }
    }

    for (const act of activityCompletions) {
      if (act.userId) {
        const existing = userStatsMap.get(act.userId) || { completed: 0, active: 0 };
        userStatsMap.set(act.userId, {
          completed: existing.completed + act.completedCount,
          active: existing.active + act.activeCount,
        });
      }
    }

    // Get user names
    const userIds = Array.from(userStatsMap.keys());
    if (userIds.length === 0) {
      return [];
    }

    const users = await db
      .select({
        id: usersSyncInNeonAuth.id,
        name: usersSyncInNeonAuth.name,
      })
      .from(usersSyncInNeonAuth)
      .where(sql`${usersSyncInNeonAuth.id} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})`);

    // Combine stats with user names
    const results = users
      .map((user) => {
        const stats = userStatsMap.get(user.id);
        return {
          userId: user.id,
          userName: user.name || 'Unknown User',
          completedCount: stats?.completed || 0,
          activeCount: stats?.active || 0,
        };
      })
      .sort((a, b) => b.completedCount - a.completedCount)
      .slice(0, limit);

    return results;
  });
}

/**
 * Upcoming Deadline Item
 */
export interface UpcomingDeadline {
  id: string;
  title: string;
  type: 'objective' | 'initiative' | 'activity';
  dueDate: Date;
  assigneeName: string | null;
  priority: 'low' | 'medium' | 'high';
  daysRemaining: number;
}

/**
 * Fetches upcoming deadlines for incomplete items
 *
 * Queries objectives, initiatives, and activities with due dates
 * within the specified number of days that are not yet completed.
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @param days - Number of days ahead to check (default: 7)
 * @returns Array of upcoming deadlines sorted by due date
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const deadlines = await getUpcomingDeadlines(user.id, 7);
 * console.log(`${deadlines.length} items due in the next 7 days`);
 * ```
 */
export async function getUpcomingDeadlines(
  userId: string,
  days: number = 7
): Promise<UpcomingDeadline[]> {
  return withRLSContext(userId, async (db) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    // Get objectives with upcoming deadlines
    const upcomingObjectives = await db
      .select({
        id: objectives.id,
        title: objectives.title,
        dueDate: objectives.endDate,
        assigneeName: usersSyncInNeonAuth.name,
        priority: objectives.priority,
      })
      .from(objectives)
      .leftJoin(
        usersSyncInNeonAuth,
        eq(objectives.assignedTo, usersSyncInNeonAuth.id)
      )
      .where(
        and(
          sql`${objectives.status} != 'completed'`,
          sql`${objectives.endDate} >= CURRENT_DATE`,
          sql`${objectives.endDate} <= CURRENT_DATE + interval '${sql.raw(days.toString())} days'`
        )
      );

    // Get initiatives with upcoming deadlines
    const upcomingInitiatives = await db
      .select({
        id: initiatives.id,
        title: initiatives.title,
        dueDate: initiatives.endDate,
        assigneeName: usersSyncInNeonAuth.name,
        priority: initiatives.priority,
      })
      .from(initiatives)
      .leftJoin(
        usersSyncInNeonAuth,
        eq(initiatives.assignedTo, usersSyncInNeonAuth.id)
      )
      .where(
        and(
          sql`${initiatives.status} != 'completed'`,
          sql`${initiatives.endDate} >= CURRENT_DATE`,
          sql`${initiatives.endDate} <= CURRENT_DATE + interval '${sql.raw(days.toString())} days'`
        )
      );

    // Get activities with upcoming deadlines
    const upcomingActivities = await db
      .select({
        id: activities.id,
        title: activities.title,
        dueDate: activities.dueDate,
        assigneeName: usersSyncInNeonAuth.name,
        priority: activities.priority,
      })
      .from(activities)
      .leftJoin(
        usersSyncInNeonAuth,
        eq(activities.assignedTo, usersSyncInNeonAuth.id)
      )
      .where(
        and(
          sql`${activities.status} != 'completed'`,
          sql`${activities.dueDate} IS NOT NULL`,
          sql`${activities.dueDate} >= CURRENT_DATE`,
          sql`${activities.dueDate} <= CURRENT_DATE + interval '${sql.raw(days.toString())} days'`
        )
      );

    // Combine all results
    const allDeadlines: UpcomingDeadline[] = [
      ...upcomingObjectives.map((obj) => ({
        id: obj.id,
        title: obj.title,
        type: 'objective' as const,
        dueDate: obj.dueDate,
        assigneeName: obj.assigneeName,
        priority: obj.priority,
        daysRemaining: Math.ceil(
          (obj.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
      ...upcomingInitiatives.map((init) => ({
        id: init.id,
        title: init.title,
        type: 'initiative' as const,
        dueDate: init.dueDate,
        assigneeName: init.assigneeName,
        priority: init.priority,
        daysRemaining: Math.ceil(
          (init.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
      ...upcomingActivities.map((act) => ({
        id: act.id,
        title: act.title,
        type: 'activity' as const,
        dueDate: act.dueDate!,
        assigneeName: act.assigneeName,
        priority: act.priority,
        daysRemaining: Math.ceil(
          (act.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
    ];

    // Sort by due date (earliest first)
    return allDeadlines.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  });
}

/**
 * Monthly Completion Trend
 */
export interface CompletionTrend {
  month: string;
  monthDate: Date;
  completedObjectives: number;
  completedInitiatives: number;
  completedActivities: number;
  totalCompleted: number;
}

/**
 * Fetches completion trends over the past months
 *
 * Groups completed objectives, initiatives, and activities by month
 * to show completion trends over time.
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @param months - Number of months to look back (default: 6)
 * @returns Array of monthly trend data
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const trends = await getCompletionTrends(user.id, 6);
 * console.log(`Last month: ${trends[trends.length - 1].totalCompleted} items completed`);
 * ```
 */
export async function getCompletionTrends(
  userId: string,
  months: number = 6
): Promise<CompletionTrend[]> {
  return withRLSContext(userId, async (db) => {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get objectives completed by month
    const objectiveTrends = await db
      .select({
        month: sql<string>`TO_CHAR(date_trunc('month', ${objectives.updatedAt}), 'YYYY-MM')`,
        monthDate: sql<Date>`date_trunc('month', ${objectives.updatedAt})`,
        count: count(),
      })
      .from(objectives)
      .where(
        and(
          eq(objectives.status, 'completed'),
          sql`${objectives.updatedAt} >= ${startDate}`,
          sql`${objectives.updatedAt} <= ${endDate}`
        )
      )
      .groupBy(sql`date_trunc('month', ${objectives.updatedAt})`);

    // Get initiatives completed by month
    const initiativeTrends = await db
      .select({
        month: sql<string>`TO_CHAR(date_trunc('month', ${initiatives.updatedAt}), 'YYYY-MM')`,
        monthDate: sql<Date>`date_trunc('month', ${initiatives.updatedAt})`,
        count: count(),
      })
      .from(initiatives)
      .where(
        and(
          eq(initiatives.status, 'completed'),
          sql`${initiatives.updatedAt} >= ${startDate}`,
          sql`${initiatives.updatedAt} <= ${endDate}`
        )
      )
      .groupBy(sql`date_trunc('month', ${initiatives.updatedAt})`);

    // Get activities completed by month
    const activityTrends = await db
      .select({
        month: sql<string>`TO_CHAR(date_trunc('month', ${activities.completedAt}), 'YYYY-MM')`,
        monthDate: sql<Date>`date_trunc('month', ${activities.completedAt})`,
        count: count(),
      })
      .from(activities)
      .where(
        and(
          eq(activities.status, 'completed'),
          sql`${activities.completedAt} IS NOT NULL`,
          sql`${activities.completedAt} >= ${startDate}`,
          sql`${activities.completedAt} <= ${endDate}`
        )
      )
      .groupBy(sql`date_trunc('month', ${activities.completedAt})`);

    // Combine results into a map
    const trendsMap = new Map<string, {
      monthDate: Date;
      objectives: number;
      initiatives: number;
      activities: number;
    }>();

    // Generate all months in range
    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
      trendsMap.set(monthKey, {
        monthDate,
        objectives: 0,
        initiatives: 0,
        activities: 0,
      });
    }

    // Populate with actual data
    for (const trend of objectiveTrends) {
      const existing = trendsMap.get(trend.month);
      if (existing) {
        existing.objectives = trend.count;
      }
    }

    for (const trend of initiativeTrends) {
      const existing = trendsMap.get(trend.month);
      if (existing) {
        existing.initiatives = trend.count;
      }
    }

    for (const trend of activityTrends) {
      const existing = trendsMap.get(trend.month);
      if (existing) {
        existing.activities = trend.count;
      }
    }

    // Convert to array and format
    const results: CompletionTrend[] = Array.from(trendsMap.entries())
      .map(([month, data]) => ({
        month: data.monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthDate: data.monthDate,
        completedObjectives: data.objectives,
        completedInitiatives: data.initiatives,
        completedActivities: data.activities,
        totalCompleted: data.objectives + data.initiatives + data.activities,
      }))
      .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());

    return results;
  });
}
