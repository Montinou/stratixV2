import { eq, and, desc, asc } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { initiatives, activities, objectives, profiles } from '../schema';
import type { Initiative, InsertInitiative, Activity } from '../schema';

// API-compatible Initiative type (matching original services.ts format)
export interface InitiativeWithRelations {
  id: string;
  objective_id: string;
  title: string;
  description?: string | null;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  start_date: string;
  end_date: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  progress?: number | null;
  owner?: {
    full_name: string;
    role_type: string;
  };
  objective_title?: string;
  activities?: ActivityCompatible[];
}

// API-compatible Activity type
export interface ActivityCompatible {
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
}

// Parameters for role-based filtering (matching existing API)
export interface FilterParams {
  userId: string;
  userRole: string;
  userDepartment: string;
}

export class InitiativesRepository {
  private db = getDrizzleClient();

  /**
   * Get initiatives by objective ID with owner information
   * Matches InitiativesService.getByObjectiveId signature
   */
  async getByObjectiveId(objectiveId: string): Promise<InitiativeWithRelations[]> {
    const result = await this.db
      .select({
        // Initiative fields
        id: initiatives.id,
        objectiveId: initiatives.objectiveId,
        title: initiatives.title,
        description: initiatives.description,
        status: initiatives.status,
        priority: initiatives.priority,
        startDate: initiatives.startDate,
        endDate: initiatives.endDate,
        ownerId: initiatives.ownerId,
        progress: initiatives.progress,
        createdAt: initiatives.createdAt,
        updatedAt: initiatives.updatedAt,
        // Owner fields for compatibility
        owner_name: profiles.fullName,
        owner_role: profiles.roleType,
      })
      .from(initiatives)
      .leftJoin(profiles, eq(initiatives.ownerId, profiles.userId))
      .where(eq(initiatives.objectiveId, objectiveId))
      .orderBy(desc(initiatives.createdAt));

    // Transform to match expected format with owner object
    return result.map(row => ({
      id: row.id,
      objective_id: row.objectiveId,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      start_date: row.startDate,
      end_date: row.endDate,
      owner_id: row.ownerId,
      progress: row.progress,
      created_at: row.createdAt?.toISOString() || '',
      updated_at: row.updatedAt?.toISOString() || '',
      owner: row.owner_name ? {
        full_name: row.owner_name,
        role_type: row.owner_role || '',
      } : undefined,
    }));
  }

  /**
   * Get all initiatives with role-based filtering and objective information
   * Matches InitiativesService.getAll signature
   */
  async getAll(filterParams: FilterParams): Promise<InitiativeWithRelations[]> {
    const { userId, userRole, userDepartment } = filterParams;
    
    const baseQuery = this.db
      .select({
        // Initiative fields
        id: initiatives.id,
        objectiveId: initiatives.objectiveId,
        title: initiatives.title,
        description: initiatives.description,
        status: initiatives.status,
        priority: initiatives.priority,
        startDate: initiatives.startDate,
        endDate: initiatives.endDate,
        ownerId: initiatives.ownerId,
        progress: initiatives.progress,
        createdAt: initiatives.createdAt,
        updatedAt: initiatives.updatedAt,
        // Owner fields
        owner_name: profiles.fullName,
        owner_role: profiles.roleType,
        // Objective title for compatibility
        objective_title: objectives.title,
      })
      .from(initiatives)
      .leftJoin(profiles, eq(initiatives.ownerId, profiles.userId))
      .leftJoin(objectives, eq(initiatives.objectiveId, objectives.id));

    // Apply role-based filtering through objectives
    let result;
    if (userRole === 'empleado') {
      result = await baseQuery
        .where(eq(objectives.ownerId, userId))
        .orderBy(desc(initiatives.createdAt));
    } else if (userRole === 'gerente') {
      result = await baseQuery
        .where(eq(objectives.department, userDepartment))
        .orderBy(desc(initiatives.createdAt));
    } else {
      result = await baseQuery.orderBy(desc(initiatives.createdAt));
    }

    // Transform to match expected format
    return result.map(row => ({
      id: row.id,
      objective_id: row.objectiveId,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      start_date: row.startDate,
      end_date: row.endDate,
      owner_id: row.ownerId,
      progress: row.progress,
      created_at: row.createdAt?.toISOString() || '',
      updated_at: row.updatedAt?.toISOString() || '',
      owner: row.owner_name ? {
        full_name: row.owner_name,
        role_type: row.owner_role || '',
      } : undefined,
      objective_title: row.objective_title || undefined,
    }));
  }

  /**
   * Get initiative by ID with owner information
   */
  async getById(id: string): Promise<InitiativeWithRelations | null> {
    const result = await this.db
      .select({
        id: initiatives.id,
        objectiveId: initiatives.objectiveId,
        title: initiatives.title,
        description: initiatives.description,
        status: initiatives.status,
        priority: initiatives.priority,
        startDate: initiatives.startDate,
        endDate: initiatives.endDate,
        ownerId: initiatives.ownerId,
        progress: initiatives.progress,
        createdAt: initiatives.createdAt,
        updatedAt: initiatives.updatedAt,
        owner_name: profiles.fullName,
        owner_role: profiles.roleType,
      })
      .from(initiatives)
      .leftJoin(profiles, eq(initiatives.ownerId, profiles.userId))
      .where(eq(initiatives.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      objective_id: row.objectiveId,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      start_date: row.startDate,
      end_date: row.endDate,
      owner_id: row.ownerId,
      progress: row.progress,
      created_at: row.createdAt?.toISOString() || '',
      updated_at: row.updatedAt?.toISOString() || '',
      owner: row.owner_name ? {
        full_name: row.owner_name,
        role_type: row.owner_role || '',
      } : undefined,
    };
  }

  /**
   * Create a new initiative
   * Matches InitiativesService.create signature
   */
  async create(initiative: {
    objective_id: string;
    title: string;
    description?: string;
    status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high';
    start_date: string;
    end_date: string;
    owner_id: string;
    progress?: number;
  }): Promise<InitiativeWithRelations> {
    const insertData: InsertInitiative = {
      objectiveId: initiative.objective_id,
      title: initiative.title,
      description: initiative.description,
      status: initiative.status,
      priority: initiative.priority,
      startDate: initiative.start_date,
      endDate: initiative.end_date,
      ownerId: initiative.owner_id,
      progress: initiative.progress,
    };

    const result = await this.db
      .insert(initiatives)
      .values(insertData)
      .returning({
        id: initiatives.id,
        objectiveId: initiatives.objectiveId,
        title: initiatives.title,
        description: initiatives.description,
        status: initiatives.status,
        priority: initiatives.priority,
        startDate: initiatives.startDate,
        endDate: initiatives.endDate,
        ownerId: initiatives.ownerId,
        progress: initiatives.progress,
        createdAt: initiatives.createdAt,
        updatedAt: initiatives.updatedAt,
      });

    const created = result[0];
    
    // Transform to match expected format
    return {
      id: created.id,
      objective_id: created.objectiveId,
      title: created.title,
      description: created.description,
      status: created.status,
      priority: created.priority,
      start_date: created.startDate,
      end_date: created.endDate,
      owner_id: created.ownerId,
      progress: created.progress,
      created_at: created.createdAt?.toISOString() || '',
      updated_at: created.updatedAt?.toISOString() || '',
    };
  }

  /**
   * Update an existing initiative
   * Matches InitiativesService.update signature
   */
  async update(id: string, updates: Partial<InitiativeWithRelations>): Promise<InitiativeWithRelations> {
    // Convert API format to Drizzle format
    const updateData: Partial<InsertInitiative> = {};
    
    if (updates.objective_id !== undefined) updateData.objectiveId = updates.objective_id;
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.start_date !== undefined) updateData.startDate = updates.start_date;
    if (updates.end_date !== undefined) updateData.endDate = updates.end_date;
    if (updates.owner_id !== undefined) updateData.ownerId = updates.owner_id;
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    
    // Always update the timestamp
    updateData.updatedAt = new Date();

    const result = await this.db
      .update(initiatives)
      .set(updateData)
      .where(eq(initiatives.id, id))
      .returning({
        id: initiatives.id,
        objectiveId: initiatives.objectiveId,
        title: initiatives.title,
        description: initiatives.description,
        status: initiatives.status,
        priority: initiatives.priority,
        startDate: initiatives.startDate,
        endDate: initiatives.endDate,
        ownerId: initiatives.ownerId,
        progress: initiatives.progress,
        createdAt: initiatives.createdAt,
        updatedAt: initiatives.updatedAt,
      });

    const updated = result[0];
    
    // Transform to match expected format
    return {
      id: updated.id,
      objective_id: updated.objectiveId,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      start_date: updated.startDate,
      end_date: updated.endDate,
      owner_id: updated.ownerId,
      progress: updated.progress,
      created_at: updated.createdAt?.toISOString() || '',
      updated_at: updated.updatedAt?.toISOString() || '',
    };
  }

  /**
   * Delete an initiative
   * Matches InitiativesService.delete signature
   */
  async delete(id: string): Promise<void> {
    await this.db
      .delete(initiatives)
      .where(eq(initiatives.id, id));
  }

  /**
   * Get activities for a specific initiative (activity tracking)
   * This provides the activity relationship functionality
   */
  async getActivitiesByInitiativeId(initiativeId: string): Promise<ActivityCompatible[]> {
    const result = await this.db
      .select({
        id: activities.id,
        initiativeId: activities.initiativeId,
        title: activities.title,
        description: activities.description,
        status: activities.status,
        priority: activities.priority,
        dueDate: activities.dueDate,
        assignedTo: activities.assignedTo,
        createdAt: activities.createdAt,
        updatedAt: activities.updatedAt,
        // Assignee info for compatibility
        assignee_name: profiles.fullName,
        assignee_role: profiles.roleType,
      })
      .from(activities)
      .leftJoin(profiles, eq(activities.assignedTo, profiles.userId))
      .where(eq(activities.initiativeId, initiativeId))
      .orderBy(asc(activities.dueDate));

    // Transform to match expected format
    return result.map(row => ({
      id: row.id,
      initiative_id: row.initiativeId,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      due_date: row.dueDate,
      assigned_to: row.assignedTo,
      created_at: row.createdAt?.toISOString() || '',
      updated_at: row.updatedAt?.toISOString() || '',
      assignee: row.assignee_name ? {
        full_name: row.assignee_name,
        role_type: row.assignee_role || '',
      } : undefined,
    }));
  }

  /**
   * Get initiative with its activities (for comprehensive activity tracking)
   */
  async getWithActivities(id: string): Promise<InitiativeWithRelations | null> {
    const initiative = await this.getById(id);
    if (!initiative) return null;

    const activities = await this.getActivitiesByInitiativeId(id);
    
    return {
      ...initiative,
      activities,
    };
  }

  /**
   * Get initiative progress based on completed activities
   * This enables activity-based progress tracking
   */
  async calculateProgress(initiativeId: string): Promise<number> {
    const activities = await this.getActivitiesByInitiativeId(initiativeId);
    
    if (activities.length === 0) return 0;
    
    const completedActivities = activities.filter(activity => activity.status === 'completed');
    return Math.round((completedActivities.length / activities.length) * 100);
  }

  /**
   * Update initiative progress based on activities
   * This provides automatic progress tracking
   */
  async updateProgressFromActivities(initiativeId: string): Promise<InitiativeWithRelations> {
    const calculatedProgress = await this.calculateProgress(initiativeId);
    return this.update(initiativeId, { progress: calculatedProgress });
  }
}