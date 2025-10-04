import { withRLSContext } from '@/lib/database/rls-client';
import { stackServerApp } from '@/stack/server';
import {
  companies,
  profiles,
  objectives,
  initiatives,
  activities,
  keyResults,
  comments,
  updateHistory
} from '@/db/okr-schema';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';

/**
 * Database client adapted for internal tooling template
 * Uses the template's stack auth and database configuration with RLS
 */
export class OKRDatabaseClient {

  /**
   * Get current user profile from Stack Auth integration
   */
  static async getCurrentUserProfile() {
    const user = await stackServerApp.getUser();
    if (!user) return null;

    return withRLSContext(user.id, async (db) => {
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
        with: {
          company: true,
          area: true,
        },
      });

      return profile;
    });
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string) {
    return withRLSContext(userId, async (db) => {
      return await db.query.profiles.findFirst({
        where: eq(profiles.id, userId),
        with: {
          company: true,
          area: true,
        },
      });
    });
  }

  /**
   * Create or update user profile
   * NOTE: This is an upsert operation that may create new profiles
   * so it uses withRLSContext for the creating user
   */
  static async upsertUserProfile(data: {
    userId: string;
    fullName: string;
    role: 'corporativo' | 'gerente' | 'empleado';
    areaId: string | null;
    companyId: string;
  }) {
    return withRLSContext(data.userId, async (db) => {
      return await db
        .insert(profiles)
        .values({
          id: data.userId,
          email: '', // Will be set by trigger or separately
          fullName: data.fullName,
          role: data.role,
          areaId: data.areaId,
          companyId: data.companyId,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: {
            fullName: data.fullName,
            role: data.role,
            areaId: data.areaId,
            updatedAt: new Date(),
          },
        })
        .returning();
    });
  }

  /**
   * Get objectives with filters and pagination
   */
  static async getObjectives(filters: {
    companyId?: string;
    areaId?: string;
    status?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const whereConditions = [];

    if (filters.companyId) {
      whereConditions.push(eq(objectives.companyId, filters.companyId));
    }
    if (filters.tenantId) {
      whereConditions.push(eq(objectives.tenantId, filters.tenantId));
    }
    if (filters.areaId) {
      whereConditions.push(eq(objectives.areaId, filters.areaId));
    }
    if (filters.status) {
      whereConditions.push(eq(objectives.status, filters.status as any));
    }
    if (filters.assignedTo) {
      whereConditions.push(eq(objectives.assignedTo, filters.assignedTo));
    }

    return await db.query.objectives.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        company: true,
        creator: true,
        assignee: true,
        initiatives: true,
        keyResults: true,
      },
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      orderBy: [desc(objectives.createdAt)],
    });
  }

  /**
   * Get initiatives with filters
   */
  static async getInitiatives(filters: {
    companyId?: string;
    objectiveId?: string;
    status?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const whereConditions = [];

    if (filters.companyId) {
      whereConditions.push(eq(initiatives.companyId, filters.companyId));
    }
    if (filters.tenantId) {
      whereConditions.push(eq(initiatives.tenantId, filters.tenantId));
    }
    if (filters.objectiveId) {
      whereConditions.push(eq(initiatives.objectiveId, filters.objectiveId));
    }
    if (filters.status) {
      whereConditions.push(eq(initiatives.status, filters.status as any));
    }
    if (filters.assignedTo) {
      whereConditions.push(eq(initiatives.assignedTo, filters.assignedTo));
    }

    return await db.query.initiatives.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        objective: true,
        company: true,
        creator: true,
        assignee: true,
        activities: true,
      },
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      orderBy: [desc(initiatives.createdAt)],
    });
  }

  /**
   * Get activities with filters
   */
  static async getActivities(filters: {
    companyId?: string;
    initiativeId?: string;
    status?: string;
    assignedTo?: string;
    overdue?: boolean;
    limit?: number;
    offset?: number;
  } = {}) {
    const whereConditions = [];

    if (filters.companyId) {
      whereConditions.push(eq(activities.companyId, filters.companyId));
    }
    if (filters.tenantId) {
      whereConditions.push(eq(activities.tenantId, filters.tenantId));
    }
    if (filters.initiativeId) {
      whereConditions.push(eq(activities.initiativeId, filters.initiativeId));
    }
    if (filters.status) {
      whereConditions.push(eq(activities.status, filters.status as any));
    }
    if (filters.assignedTo) {
      whereConditions.push(eq(activities.assignedTo, filters.assignedTo));
    }
    if (filters.overdue) {
      whereConditions.push(sql`${activities.dueDate} < NOW() AND ${activities.status} != 'completed'`);
    }

    return await db.query.activities.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        initiative: {
          with: {
            objective: true,
          },
        },
        company: true,
        creator: true,
        assignee: true,
      },
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      orderBy: [asc(activities.dueDate)],
    });
  }

  /**
   * Create objective
   */
  static async createObjective(data: {
    title: string;
    description?: string;
    areaId: string | null;
    priority: 'low' | 'medium' | 'high';
    targetValue?: string;
    unit?: string;
    startDate: Date;
    endDate: Date;
    companyId: string;
    assignedTo?: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });

    return await db.insert(objectives).values({
      ...data,
      createdBy: user.id,
    }).returning();
  }

  /**
   * Update objective
   */
  static async updateObjective(objectiveId: string, data: Partial<{
    title: string;
    description: string;
    status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    progressPercentage: string;
    targetValue: string;
    currentValue: string;
    assignedTo: string;
  }>) {
    return await db
      .update(objectives)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(objectives.id, objectiveId))
      .returning();
  }

  /**
   * Get analytics data
   */
  static async getAnalytics(filters: {
    companyId: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const whereConditions = [
      eq(objectives.companyId, filters.companyId),
    ];

    if (filters.startDate) {
      whereConditions.push(sql`${objectives.createdAt} >= ${filters.startDate}`);
    }
    if (filters.endDate) {
      whereConditions.push(sql`${objectives.createdAt} <= ${filters.endDate}`);
    }

    // Get objective counts by status
    const objectiveStats = await db
      .select({
        status: objectives.status,
        count: count(),
      })
      .from(objectives)
      .where(and(...whereConditions))
      .groupBy(objectives.status);

    // Get initiative counts
    const initiativeStats = await db
      .select({
        status: initiatives.status,
        count: count(),
      })
      .from(initiatives)
      .where(eq(initiatives.companyId, filters.companyId))
      .groupBy(initiatives.status);

    // Get activity counts
    const activityStats = await db
      .select({
        status: activities.status,
        count: count(),
      })
      .from(activities)
      .where(eq(activities.companyId, filters.companyId))
      .groupBy(activities.status);

    // Get progress by area
    const areaProgress = await db
      .select({
        areaId: objectives.areaId,
        avgProgress: sql<number>`AVG(CAST(${objectives.progressPercentage} AS DECIMAL))`,
        count: count(),
      })
      .from(objectives)
      .where(and(...whereConditions))
      .groupBy(objectives.areaId);

    return {
      objectives: objectiveStats,
      initiatives: initiativeStats,
      activities: activityStats,
      areaProgress,
    };
  }

  /**
   * Get dashboard summary for user
   */
  static async getDashboardSummary(userId: string) {
    const userProfile = await this.getUserProfile(userId);
    if (!userProfile) throw new Error('User profile not found');

    const { companyId } = userProfile;
    if (!companyId) throw new Error('User profile has no company');

    // Get user's assigned objectives
    const userObjectives = await this.getObjectives({
      companyId,
      assignedTo: userId,
      limit: 10,
    });

    // Get user's assigned activities that are due soon
    const upcomingActivities = await this.getActivities({
      companyId,
      assignedTo: userId,
      limit: 10,
    });

    // Get overdue activities
    const overdueActivities = await this.getActivities({
      companyId,
      assignedTo: userId,
      overdue: true,
      limit: 5,
    });

    // Get analytics for company
    const analytics = await this.getAnalytics({
      companyId,
    });

    return {
      userObjectives,
      upcomingActivities,
      overdueActivities,
      analytics,
      userProfile,
    };
  }

  /**
   * Record update history
   */
  static async recordUpdate(data: {
    entityType: 'objective' | 'initiative' | 'activity';
    entityId: string;
    field: string;
    oldValue?: string;
    newValue?: string;
    companyId: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });

    return await db.insert(updateHistory).values({
      ...data,
      updatedBy: user.id,
    });
  }
}