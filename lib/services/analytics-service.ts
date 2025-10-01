import { sql, count } from 'drizzle-orm';
import { withRLSContext } from '@/lib/database/rls-client';
import { objectives, initiatives, activities, profiles } from '@/db/okr-schema';

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
