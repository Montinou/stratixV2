import { eq, sql } from 'drizzle-orm';
import { withRLSContext } from '@/lib/database/rls-client';
import { objectives } from '@/db/okr-schema';
import { usersSyncInNeonAuth } from '@/db/neon_auth_schema';

/**
 * Objective with related information for display
 */
export interface ObjectiveWithRelations {
  id: string;
  title: string;
  description: string | null;
  areaId: string | null;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  progressPercentage: string | null;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  startDate: Date;
  endDate: Date;
  assignedToName: string | null;
  createdAt: Date;
}

/**
 * Statistics for objectives page
 */
export interface ObjectiveStats {
  total: number;
  active: number;
  completed: number;
  highPriority: number;
  averageProgress: number;
}

/**
 * Fetches all objectives for the current user's organization with related data
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @returns Array of objectives with assignee information
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const objectives = await getObjectivesForPage(user.id);
 * ```
 */
export async function getObjectivesForPage(
  userId: string
): Promise<ObjectiveWithRelations[]> {
  return withRLSContext(userId, async (db) => {
    const results = await db
      .select({
        id: objectives.id,
        title: objectives.title,
        description: objectives.description,
        areaId: objectives.areaId,
        status: objectives.status,
        priority: objectives.priority,
        progressPercentage: objectives.progressPercentage,
        targetValue: objectives.targetValue,
        currentValue: objectives.currentValue,
        unit: objectives.unit,
        startDate: objectives.startDate,
        endDate: objectives.endDate,
        assignedToName: usersSyncInNeonAuth.name,
        createdAt: objectives.createdAt,
      })
      .from(objectives)
      .leftJoin(
        usersSyncInNeonAuth,
        eq(objectives.assignedTo, usersSyncInNeonAuth.id)
      )
      .orderBy(sql`${objectives.createdAt} DESC`);

    return results.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      areaId: row.areaId,
      status: row.status,
      priority: row.priority,
      progressPercentage: row.progressPercentage,
      targetValue: row.targetValue,
      currentValue: row.currentValue,
      unit: row.unit,
      startDate: row.startDate,
      endDate: row.endDate,
      assignedToName: row.assignedToName,
      createdAt: row.createdAt,
    }));
  });
}

/**
 * Calculates statistics for all objectives in the user's organization
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @returns Objective statistics including total, active, completed, high priority, and average progress
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const stats = await getObjectiveStats(user.id);
 * console.log(`Total objectives: ${stats.total}`);
 * ```
 */
export async function getObjectiveStats(
  userId: string
): Promise<ObjectiveStats> {
  return withRLSContext(userId, async (db) => {
    const results = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) FILTER (WHERE ${objectives.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${objectives.status} = 'completed')::int`,
        highPriority: sql<number>`count(*) FILTER (WHERE ${objectives.priority} = 'high')::int`,
        averageProgress: sql<number>`COALESCE(AVG(CAST(${objectives.progressPercentage} AS NUMERIC)), 0)::int`,
      })
      .from(objectives);

    const stats = results[0];

    return {
      total: stats.total,
      active: stats.active,
      completed: stats.completed,
      highPriority: stats.highPriority,
      averageProgress: stats.averageProgress,
    };
  });
}
