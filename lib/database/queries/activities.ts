import { eq, and, desc, asc } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { activities, profiles, initiatives, objectives, type Activity as DrizzleActivity, type InsertActivity } from '../schema';

// Interface to match existing services.ts Activity for API compatibility
export interface Activity {
  id: string;
  initiative_id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  assignee?: {
    full_name: string;
    role_type: string;
  };
  initiative_title?: string;
  objective_title?: string;
}

// Parameters for role-based filtering (matching existing API)
export interface FilterParams {
  userId: string;
  userRole: string;
  userDepartment: string;
}

/**
 * ActivitiesRepository - Type-safe repository for activity operations using Drizzle ORM
 * 
 * Maintains exact API compatibility with existing ActivitiesService while using
 * Drizzle ORM for type safety and better query performance.
 * Implements sophisticated filtering and assignment tracking capabilities.
 */
export class ActivitiesRepository {
  private static db = getDrizzleClient();

  /**
   * Convert Drizzle activity to service API format
   */
  private static toDomainModel(
    drizzleActivity: DrizzleActivity,
    assigneeName?: string | null,
    assigneeRole?: string | null,
    initiativeTitle?: string | null,
    objectiveTitle?: string | null
  ): Activity {
    return {
      id: drizzleActivity.id,
      initiative_id: drizzleActivity.initiativeId,
      title: drizzleActivity.title,
      description: drizzleActivity.description,
      status: drizzleActivity.status,
      priority: drizzleActivity.priority,
      due_date: drizzleActivity.dueDate,
      assigned_to: drizzleActivity.assignedTo,
      created_at: drizzleActivity.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: drizzleActivity.updatedAt?.toISOString() || new Date().toISOString(),
      assignee: assigneeName ? {
        full_name: assigneeName,
        role_type: assigneeRole || '',
      } : undefined,
      initiative_title: initiativeTitle || undefined,
      objective_title: objectiveTitle || undefined,
    };
  }

  /**
   * Convert service API format to Drizzle insert format
   */
  private static toDbModel(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at' | 'assignee' | 'initiative_title' | 'objective_title'>): InsertActivity {
    return {
      initiativeId: activity.initiative_id,
      title: activity.title,
      description: activity.description,
      status: activity.status,
      priority: activity.priority,
      dueDate: activity.due_date,
      assignedTo: activity.assigned_to,
    };
  }

  /**
   * Get activities by initiative ID with assignee information
   * Matches ActivitiesService.getByInitiativeId signature
   */
  static async getByInitiativeId(initiativeId: string): Promise<Activity[]> {
    try {
      const result = await this.db
        .select({
          // Activity fields
          activity: activities,
          // Assignee fields
          assigneeName: profiles.fullName,
          assigneeRole: profiles.roleType,
        })
        .from(activities)
        .leftJoin(profiles, eq(activities.assignedTo, profiles.userId))
        .where(eq(activities.initiativeId, initiativeId))
        .orderBy(asc(activities.dueDate));

      return result.map(row => this.toDomainModel(
        row.activity,
        row.assigneeName,
        row.assigneeRole
      ));
    } catch (error) {
      console.error('Error fetching activities by initiative ID:', error);
      throw error;
    }
  }

  /**
   * Get all activities with role-based filtering and context information
   * Matches ActivitiesService.getAll signature with sophisticated filtering
   */
  static async getAll(filterParams: FilterParams): Promise<Activity[]> {
    const { userId, userRole, userDepartment } = filterParams;
    
    try {
      const baseQuery = this.db
        .select({
          // Activity fields
          activity: activities,
          // Assignee fields
          assigneeName: profiles.fullName,
          assigneeRole: profiles.roleType,
          // Initiative title for context
          initiativeTitle: initiatives.title,
          // Objective title for context
          objectiveTitle: objectives.title,
        })
        .from(activities)
        .leftJoin(profiles, eq(activities.assignedTo, profiles.userId))
        .leftJoin(initiatives, eq(activities.initiativeId, initiatives.id))
        .leftJoin(objectives, eq(initiatives.objectiveId, objectives.id));

      // Apply role-based filtering
      let result;
      if (userRole === 'empleado') {
        // Employee sees activities assigned to them OR activities from objectives they own
        result = await baseQuery
          .where(and(
            // Either assigned to user or user owns the objective
            eq(activities.assignedTo, userId),
            eq(objectives.ownerId, userId)
          ))
          .orderBy(asc(activities.dueDate));
      } else if (userRole === 'gerente') {
        // Manager sees activities from their department
        result = await baseQuery
          .where(eq(objectives.department, userDepartment))
          .orderBy(asc(activities.dueDate));
      } else {
        // Corporate level sees all activities
        result = await baseQuery
          .orderBy(asc(activities.dueDate));
      }

      return result.map(row => this.toDomainModel(
        row.activity,
        row.assigneeName,
        row.assigneeRole,
        row.initiativeTitle,
        row.objectiveTitle
      ));
    } catch (error) {
      console.error('Error fetching all activities:', error);
      throw error;
    }
  }

  /**
   * Get activity by ID with full context information
   */
  static async getById(id: string): Promise<Activity | null> {
    try {
      const result = await this.db
        .select({
          activity: activities,
          assigneeName: profiles.fullName,
          assigneeRole: profiles.roleType,
          initiativeTitle: initiatives.title,
          objectiveTitle: objectives.title,
        })
        .from(activities)
        .leftJoin(profiles, eq(activities.assignedTo, profiles.userId))
        .leftJoin(initiatives, eq(activities.initiativeId, initiatives.id))
        .leftJoin(objectives, eq(initiatives.objectiveId, objectives.id))
        .where(eq(activities.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return this.toDomainModel(
        row.activity,
        row.assigneeName,
        row.assigneeRole,
        row.initiativeTitle,
        row.objectiveTitle
      );
    } catch (error) {
      console.error('Error fetching activity by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new activity
   * Matches ActivitiesService.create signature
   */
  static async create(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at' | 'assignee' | 'initiative_title' | 'objective_title'>): Promise<Activity> {
    try {
      const dbActivity = this.toDbModel(activity);
      
      const result = await this.db
        .insert(activities)
        .values(dbActivity)
        .returning();

      if (result.length === 0) {
        throw new Error('Failed to create activity');
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }

  /**
   * Update an existing activity
   * Matches ActivitiesService.update signature
   */
  static async update(id: string, updates: Partial<Activity>): Promise<Activity> {
    try {
      // Convert updates to database format
      const dbUpdates: Partial<InsertActivity> = {};
      
      if (updates.initiative_id !== undefined) {
        dbUpdates.initiativeId = updates.initiative_id;
      }
      if (updates.title !== undefined) {
        dbUpdates.title = updates.title;
      }
      if (updates.description !== undefined) {
        dbUpdates.description = updates.description;
      }
      if (updates.status !== undefined) {
        dbUpdates.status = updates.status;
      }
      if (updates.priority !== undefined) {
        dbUpdates.priority = updates.priority;
      }
      if (updates.due_date !== undefined) {
        dbUpdates.dueDate = updates.due_date;
      }
      if (updates.assigned_to !== undefined) {
        dbUpdates.assignedTo = updates.assigned_to;
      }

      // Always update the timestamp
      dbUpdates.updatedAt = new Date();

      const result = await this.db
        .update(activities)
        .set(dbUpdates)
        .where(eq(activities.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error(`Activity with id ${id} not found`);
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  }

  /**
   * Delete an activity
   * Matches ActivitiesService.delete signature
   */
  static async delete(id: string): Promise<void> {
    try {
      await this.db
        .delete(activities)
        .where(eq(activities.id, id));
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }

  /**
   * Get activities assigned to a specific user (assignment tracking)
   * @param userId - User ID to filter by
   * @returns Activities assigned to the user
   */
  static async getByAssigneeId(userId: string): Promise<Activity[]> {
    try {
      const result = await this.db
        .select({
          activity: activities,
          assigneeName: profiles.fullName,
          assigneeRole: profiles.roleType,
          initiativeTitle: initiatives.title,
          objectiveTitle: objectives.title,
        })
        .from(activities)
        .leftJoin(profiles, eq(activities.assignedTo, profiles.userId))
        .leftJoin(initiatives, eq(activities.initiativeId, initiatives.id))
        .leftJoin(objectives, eq(initiatives.objectiveId, objectives.id))
        .where(eq(activities.assignedTo, userId))
        .orderBy(asc(activities.dueDate));

      return result.map(row => this.toDomainModel(
        row.activity,
        row.assigneeName,
        row.assigneeRole,
        row.initiativeTitle,
        row.objectiveTitle
      ));
    } catch (error) {
      console.error('Error fetching activities by assignee:', error);
      throw error;
    }
  }

  /**
   * Get activities by status (for status-based filtering)
   * @param status - Activity status to filter by
   * @returns Activities with the specified status
   */
  static async getByStatus(status: Activity['status']): Promise<Activity[]> {
    try {
      const result = await this.db
        .select({
          activity: activities,
          assigneeName: profiles.fullName,
          assigneeRole: profiles.roleType,
          initiativeTitle: initiatives.title,
          objectiveTitle: objectives.title,
        })
        .from(activities)
        .leftJoin(profiles, eq(activities.assignedTo, profiles.userId))
        .leftJoin(initiatives, eq(activities.initiativeId, initiatives.id))
        .leftJoin(objectives, eq(initiatives.objectiveId, objectives.id))
        .where(eq(activities.status, status))
        .orderBy(asc(activities.dueDate));

      return result.map(row => this.toDomainModel(
        row.activity,
        row.assigneeName,
        row.assigneeRole,
        row.initiativeTitle,
        row.objectiveTitle
      ));
    } catch (error) {
      console.error('Error fetching activities by status:', error);
      throw error;
    }
  }

  /**
   * Get activities by priority (for priority-based filtering)
   * @param priority - Activity priority to filter by
   * @returns Activities with the specified priority
   */
  static async getByPriority(priority: Activity['priority']): Promise<Activity[]> {
    try {
      const result = await this.db
        .select({
          activity: activities,
          assigneeName: profiles.fullName,
          assigneeRole: profiles.roleType,
          initiativeTitle: initiatives.title,
          objectiveTitle: objectives.title,
        })
        .from(activities)
        .leftJoin(profiles, eq(activities.assignedTo, profiles.userId))
        .leftJoin(initiatives, eq(activities.initiativeId, initiatives.id))
        .leftJoin(objectives, eq(initiatives.objectiveId, objectives.id))
        .where(eq(activities.priority, priority))
        .orderBy(asc(activities.dueDate));

      return result.map(row => this.toDomainModel(
        row.activity,
        row.assigneeName,
        row.assigneeRole,
        row.initiativeTitle,
        row.objectiveTitle
      ));
    } catch (error) {
      console.error('Error fetching activities by priority:', error);
      throw error;
    }
  }

  /**
   * Get overdue activities (advanced filtering)
   * @returns Activities that are past their due date and not completed
   */
  static async getOverdue(): Promise<Activity[]> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const result = await this.db
        .select({
          activity: activities,
          assigneeName: profiles.fullName,
          assigneeRole: profiles.roleType,
          initiativeTitle: initiatives.title,
          objectiveTitle: objectives.title,
        })
        .from(activities)
        .leftJoin(profiles, eq(activities.assignedTo, profiles.userId))
        .leftJoin(initiatives, eq(activities.initiativeId, initiatives.id))
        .leftJoin(objectives, eq(initiatives.objectiveId, objectives.id))
        .where(and(
          eq(activities.dueDate, today), // Due date is before today
          eq(activities.status, 'completed') // Not completed
        ))
        .orderBy(asc(activities.dueDate));

      return result.map(row => this.toDomainModel(
        row.activity,
        row.assigneeName,
        row.assigneeRole,
        row.initiativeTitle,
        row.objectiveTitle
      ));
    } catch (error) {
      console.error('Error fetching overdue activities:', error);
      throw error;
    }
  }

  /**
   * Get activity completion statistics for an initiative
   * @param initiativeId - Initiative ID
   * @returns Completion statistics
   */
  static async getCompletionStats(initiativeId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    cancelled: number;
    completionPercentage: number;
  }> {
    try {
      const activities = await this.getByInitiativeId(initiativeId);
      
      const stats = activities.reduce((acc, activity) => {
        acc.total++;
        acc[activity.status]++;
        return acc;
      }, {
        total: 0,
        completed: 0,
        in_progress: 0,
        todo: 0,
        cancelled: 0,
      });

      const completionPercentage = stats.total > 0 
        ? Math.round((stats.completed / stats.total) * 100)
        : 0;

      return {
        ...stats,
        inProgress: stats.in_progress,
        completionPercentage,
      };
    } catch (error) {
      console.error('Error calculating completion stats:', error);
      throw error;
    }
  }

  /**
   * Check if an activity exists
   * @param id - Activity ID to check
   * @returns Boolean indicating if activity exists
   */
  static async exists(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .select({ id: activities.id })
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Error checking activity existence:', error);
      throw error;
    }
  }
}