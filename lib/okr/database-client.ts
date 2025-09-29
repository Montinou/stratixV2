import db from '@/db';
import { stackServerApp } from '@/stack';
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
 * Uses the template's stack auth and database configuration
 */
export class OKRDatabaseClient {

  /**
   * Get current user profile from Stack Auth integration
   */
  static async getCurrentUserProfile() {
    const user = await stackServerApp.getUser();
    if (!user) return null;

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id),
      with: {
        company: true,
      },
    });

    return profile;
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId: string) {
    return await db.query.profiles.findFirst({
      where: eq(profiles.userId, userId),
      with: {
        company: true,
      },
    });
  }

  /**
   * Create or update user profile
   */
  static async upsertUserProfile(data: {
    userId: string;
    fullName: string;
    roleType: 'corporativo' | 'gerente' | 'empleado';
    department: string;
    companyId: string;
    tenantId: string;
  }) {
    return await db
      .insert(profiles)
      .values(data)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          fullName: data.fullName,
          roleType: data.roleType,
          department: data.department,
          updatedAt: new Date(),
        },
      })
      .returning();
  }

  /**
   * Get objectives with filters and pagination
   */
  static async getObjectives(filters: {
    companyId?: string;
    tenantId?: string;
    department?: string;
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
    if (filters.department) {
      whereConditions.push(eq(objectives.department, filters.department));
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
    tenantId?: string;
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
    tenantId?: string;
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
    department: string;
    priority: 'low' | 'medium' | 'high';
    targetValue?: string;
    unit?: string;
    startDate: Date;
    endDate: Date;
    companyId: string;
    tenantId: string;
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
    tenantId: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const whereConditions = [
      eq(objectives.companyId, filters.companyId),
      eq(objectives.tenantId, filters.tenantId),
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
      .where(and(
        eq(initiatives.companyId, filters.companyId),
        eq(initiatives.tenantId, filters.tenantId)
      ))
      .groupBy(initiatives.status);

    // Get activity counts
    const activityStats = await db
      .select({
        status: activities.status,
        count: count(),
      })
      .from(activities)
      .where(and(
        eq(activities.companyId, filters.companyId),
        eq(activities.tenantId, filters.tenantId)
      ))
      .groupBy(activities.status);

    // Get progress by department
    const departmentProgress = await db
      .select({
        department: objectives.department,
        avgProgress: sql<number>`AVG(CAST(${objectives.progressPercentage} AS DECIMAL))`,
        count: count(),
      })
      .from(objectives)
      .where(and(...whereConditions))
      .groupBy(objectives.department);

    return {
      objectives: objectiveStats,
      initiatives: initiativeStats,
      activities: activityStats,
      departmentProgress,
    };
  }

  /**
   * Get dashboard summary for user
   */
  static async getDashboardSummary(userId: string) {
    const userProfile = await this.getUserProfile(userId);
    if (!userProfile) throw new Error('User profile not found');

    const { companyId, tenantId } = userProfile;

    // Get user's assigned objectives
    const userObjectives = await this.getObjectives({
      companyId,
      tenantId,
      assignedTo: userId,
      limit: 10,
    });

    // Get user's assigned activities that are due soon
    const upcomingActivities = await this.getActivities({
      companyId,
      tenantId,
      assignedTo: userId,
      limit: 10,
    });

    // Get overdue activities
    const overdueActivities = await this.getActivities({
      companyId,
      tenantId,
      assignedTo: userId,
      overdue: true,
      limit: 5,
    });

    // Get analytics for company
    const analytics = await this.getAnalytics({
      companyId,
      tenantId,
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
    tenantId: string;
  }) {
    const user = await stackServerApp.getUser({ or: 'throw' });

    return await db.insert(updateHistory).values({
      ...data,
      updatedBy: user.id,
    });
  }
}