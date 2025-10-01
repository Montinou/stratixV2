import { eq, and, lt, ne, sql } from 'drizzle-orm';
import { withRLSContext } from '@/lib/database/rls-client';
import { activities, initiatives } from '@/db/okr-schema';
import { usersSyncInNeonAuth } from '@/db/neon_auth_schema';

/**
 * Activity with related information for display
 */
export interface ActivityWithRelations {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  estimatedHours: string | null;
  actualHours: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  initiativeTitle: string;
  assignedToName: string | null;
  createdAt: Date;
}

/**
 * Statistics for activities page
 */
export interface ActivityStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

/**
 * Fetches all activities for the current user's organization with related data
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @returns Array of activities with initiative and assignee information
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const activities = await getActivitiesForPage(user.id);
 * ```
 */
export async function getActivitiesForPage(
  userId: string
): Promise<ActivityWithRelations[]> {
  return withRLSContext(userId, async (db) => {
    const results = await db
      .select({
        id: activities.id,
        title: activities.title,
        description: activities.description,
        status: activities.status,
        priority: activities.priority,
        estimatedHours: activities.estimatedHours,
        actualHours: activities.actualHours,
        dueDate: activities.dueDate,
        completedAt: activities.completedAt,
        initiativeTitle: initiatives.title,
        assignedToName: usersSyncInNeonAuth.name,
        createdAt: activities.createdAt,
      })
      .from(activities)
      .innerJoin(initiatives, eq(activities.initiativeId, initiatives.id))
      .leftJoin(
        usersSyncInNeonAuth,
        eq(activities.assignedTo, usersSyncInNeonAuth.id)
      )
      .orderBy(sql`
        CASE ${activities.priority}
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END ASC,
        ${activities.dueDate} ASC NULLS LAST
      `);

    return results.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      estimatedHours: row.estimatedHours,
      actualHours: row.actualHours,
      dueDate: row.dueDate,
      completedAt: row.completedAt,
      initiativeTitle: row.initiativeTitle,
      assignedToName: row.assignedToName,
      createdAt: row.createdAt,
    }));
  });
}

/**
 * Calculates statistics for all activities in the user's organization
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @returns Activity statistics including total, pending, in progress, completed, and overdue counts
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const stats = await getActivityStats(user.id);
 * console.log(`Overdue activities: ${stats.overdue}`);
 * ```
 */
export async function getActivityStats(
  userId: string
): Promise<ActivityStats> {
  return withRLSContext(userId, async (db) => {
    const results = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) FILTER (WHERE ${activities.status} = 'todo')::int`,
        inProgress: sql<number>`count(*) FILTER (WHERE ${activities.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${activities.status} = 'completed')::int`,
        overdue: sql<number>`count(*) FILTER (
          WHERE ${activities.status} != 'completed'
          AND ${activities.dueDate} < CURRENT_DATE
        )::int`,
      })
      .from(activities);

    const stats = results[0];

    return {
      total: stats.total,
      pending: stats.pending,
      inProgress: stats.inProgress,
      completed: stats.completed,
      overdue: stats.overdue,
    };
  });
}
