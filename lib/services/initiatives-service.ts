import { eq, sql } from 'drizzle-orm';
import { withRLSContext } from '@/lib/database/rls-client';
import { initiatives, objectives } from '@/db/okr-schema';
import { usersSyncInNeonAuth } from '@/db/neon_auth_schema';

/**
 * Initiative with related information for display
 */
export interface InitiativeWithRelations {
  id: string;
  title: string;
  description: string | null;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  progressPercentage: string | null;
  budget: string | null;
  startDate: Date;
  endDate: Date;
  objectiveTitle: string;
  assignedToName: string | null;
  createdAt: Date;
}

/**
 * Statistics for initiatives page
 */
export interface InitiativeStats {
  total: number;
  planning: number;
  active: number;
  completed: number;
  totalBudget: number;
  averageProgress: number;
}

/**
 * Fetches all initiatives for the current user's organization with related data
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @returns Array of initiatives with objective and assignee information
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const initiatives = await getInitiativesForPage(user.id);
 * ```
 */
export async function getInitiativesForPage(
  userId: string
): Promise<InitiativeWithRelations[]> {
  return withRLSContext(userId, async (db) => {
    const results = await db
      .select({
        id: initiatives.id,
        title: initiatives.title,
        description: initiatives.description,
        status: initiatives.status,
        priority: initiatives.priority,
        progressPercentage: initiatives.progressPercentage,
        budget: initiatives.budget,
        startDate: initiatives.startDate,
        endDate: initiatives.endDate,
        objectiveTitle: objectives.title,
        assignedToName: usersSyncInNeonAuth.name,
        createdAt: initiatives.createdAt,
      })
      .from(initiatives)
      .innerJoin(objectives, eq(initiatives.objectiveId, objectives.id))
      .leftJoin(
        usersSyncInNeonAuth,
        eq(initiatives.assignedTo, usersSyncInNeonAuth.id)
      )
      .orderBy(sql`
        CASE ${initiatives.priority}
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END ASC,
        ${initiatives.createdAt} DESC
      `);

    return results.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      progressPercentage: row.progressPercentage,
      budget: row.budget,
      startDate: row.startDate,
      endDate: row.endDate,
      objectiveTitle: row.objectiveTitle,
      assignedToName: row.assignedToName,
      createdAt: row.createdAt,
    }));
  });
}

/**
 * Calculates statistics for all initiatives in the user's organization
 *
 * @param userId - The authenticated user's ID (from Stack Auth)
 * @returns Initiative statistics including total, planning, active, completed, budget, and progress
 *
 * @example
 * ```ts
 * const user = await stackServerApp.getUser();
 * const stats = await getInitiativeStats(user.id);
 * console.log(`Total budget: ${stats.totalBudget}`);
 * ```
 */
export async function getInitiativeStats(
  userId: string
): Promise<InitiativeStats> {
  return withRLSContext(userId, async (db) => {
    const results = await db
      .select({
        total: sql<number>`count(*)::int`,
        planning: sql<number>`count(*) FILTER (WHERE ${initiatives.status} = 'planning')::int`,
        active: sql<number>`count(*) FILTER (WHERE ${initiatives.status} = 'in_progress')::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${initiatives.status} = 'completed')::int`,
        totalBudget: sql<number>`COALESCE(SUM(${initiatives.budget}), 0)::numeric`,
        averageProgress: sql<number>`COALESCE(AVG(${initiatives.progressPercentage}), 0)::numeric`,
      })
      .from(initiatives);

    const stats = results[0];

    return {
      total: stats.total,
      planning: stats.planning,
      active: stats.active,
      completed: stats.completed,
      totalBudget: Number(stats.totalBudget),
      averageProgress: Number(stats.averageProgress),
    };
  });
}
