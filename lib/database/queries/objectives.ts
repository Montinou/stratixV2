import { eq, and, desc } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { objectives, profiles, companies, type Objective as DrizzleObjective, type InsertObjective } from '../schema';

// Interface to match existing services.ts Objective for API compatibility
export interface Objective {
  id: string;
  title: string;
  description?: string;
  department: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  start_date: string;
  end_date: string;
  owner_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  progress?: number;
  owner?: {
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

/**
 * ObjectivesRepository - Type-safe repository for objective operations using Drizzle ORM
 * 
 * Maintains exact API compatibility with existing ObjectivesService while using
 * Drizzle ORM for type safety and better query performance.
 */
export class ObjectivesRepository {
  private static db = getDrizzleClient();

  /**
   * Convert Drizzle objective to service API format
   */
  private static toDomainModel(drizzleObjective: DrizzleObjective, ownerName?: string, ownerRole?: string): Objective {
    return {
      id: drizzleObjective.id,
      title: drizzleObjective.title,
      description: drizzleObjective.description,
      department: drizzleObjective.department,
      status: drizzleObjective.status,
      priority: drizzleObjective.priority,
      start_date: drizzleObjective.startDate,
      end_date: drizzleObjective.endDate,
      owner_id: drizzleObjective.ownerId,
      company_id: drizzleObjective.companyId,
      progress: drizzleObjective.progress,
      created_at: drizzleObjective.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: drizzleObjective.updatedAt?.toISOString() || new Date().toISOString(),
      owner: ownerName ? {
        full_name: ownerName,
        role_type: ownerRole || '',
      } : undefined,
    };
  }

  /**
   * Convert service API format to Drizzle insert format
   */
  private static toDbModel(objective: Omit<Objective, 'id' | 'created_at' | 'updated_at' | 'owner'>): InsertObjective {
    return {
      title: objective.title,
      description: objective.description,
      department: objective.department,
      status: objective.status,
      priority: objective.priority,
      startDate: objective.start_date,
      endDate: objective.end_date,
      ownerId: objective.owner_id,
      companyId: objective.company_id,
      progress: objective.progress,
    };
  }

  /**
   * Get all objectives with role-based filtering
   * Matches ObjectivesService.getAll signature
   */
  static async getAll(filterParams: FilterParams): Promise<Objective[]> {
    const { userId, userRole, userDepartment } = filterParams;
    
    const baseQuery = this.db
      .select({
        objective: objectives,
        ownerName: profiles.fullName,
        ownerRole: profiles.roleType,
      })
      .from(objectives)
      .leftJoin(profiles, eq(objectives.ownerId, profiles.userId));

    // Apply role-based filtering
    let result;
    if (userRole === 'empleado') {
      result = await baseQuery
        .where(eq(objectives.ownerId, userId))
        .orderBy(desc(objectives.createdAt));
    } else if (userRole === 'gerente') {
      result = await baseQuery
        .where(eq(objectives.department, userDepartment))
        .orderBy(desc(objectives.createdAt));
    } else {
      result = await baseQuery.orderBy(desc(objectives.createdAt));
    }

    return result.map(row => this.toDomainModel(row.objective, row.ownerName || undefined, row.ownerRole || undefined));
  }

  /**
   * Get objective by ID with owner information
   * Matches ObjectivesService.getById signature
   */
  static async getById(id: string, userId: string): Promise<Objective | null> {
    try {
      const result = await this.db
        .select({
          objective: objectives,
          ownerName: profiles.fullName,
          ownerRole: profiles.roleType,
        })
        .from(objectives)
        .leftJoin(profiles, eq(objectives.ownerId, profiles.userId))
        .where(eq(objectives.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return this.toDomainModel(row.objective, row.ownerName || undefined, row.ownerRole || undefined);
    } catch (error) {
      console.error('Error fetching objective by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new objective
   * Matches ObjectivesService.create signature
   */
  static async create(objective: Omit<Objective, 'id' | 'created_at' | 'updated_at' | 'owner'>): Promise<Objective> {
    try {
      const dbObjective = this.toDbModel(objective);
      
      const result = await this.db
        .insert(objectives)
        .values(dbObjective)
        .returning();

      if (result.length === 0) {
        throw new Error('Failed to create objective');
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error creating objective:', error);
      throw error;
    }
  }

  /**
   * Update an existing objective
   * Matches ObjectivesService.update signature
   */
  static async update(id: string, updates: Partial<Objective>): Promise<Objective> {
    try {
      // Convert updates to database format
      const dbUpdates: Partial<InsertObjective> = {};
      
      if (updates.title !== undefined) {
        dbUpdates.title = updates.title;
      }
      if (updates.description !== undefined) {
        dbUpdates.description = updates.description;
      }
      if (updates.department !== undefined) {
        dbUpdates.department = updates.department;
      }
      if (updates.status !== undefined) {
        dbUpdates.status = updates.status;
      }
      if (updates.priority !== undefined) {
        dbUpdates.priority = updates.priority;
      }
      if (updates.start_date !== undefined) {
        dbUpdates.startDate = updates.start_date;
      }
      if (updates.end_date !== undefined) {
        dbUpdates.endDate = updates.end_date;
      }
      if (updates.owner_id !== undefined) {
        dbUpdates.ownerId = updates.owner_id;
      }
      if (updates.company_id !== undefined) {
        dbUpdates.companyId = updates.company_id;
      }
      if (updates.progress !== undefined) {
        dbUpdates.progress = updates.progress;
      }

      // Always update the timestamp
      dbUpdates.updatedAt = new Date();

      const result = await this.db
        .update(objectives)
        .set(dbUpdates)
        .where(eq(objectives.id, id))
        .returning();

      if (result.length === 0) {
        throw new Error(`Objective with id ${id} not found`);
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error updating objective:', error);
      throw error;
    }
  }

  /**
   * Delete an objective
   * Matches ObjectivesService.delete signature
   */
  static async delete(id: string): Promise<void> {
    try {
      await this.db
        .delete(objectives)
        .where(eq(objectives.id, id));
    } catch (error) {
      console.error('Error deleting objective:', error);
      throw error;
    }
  }

  /**
   * Check if an objective exists
   * @param id - Objective ID to check
   * @returns Boolean indicating if objective exists
   */
  static async exists(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .select({ id: objectives.id })
        .from(objectives)
        .where(eq(objectives.id, id))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Error checking objective existence:', error);
      throw error;
    }
  }

  /**
   * Get objectives by company ID (for company-specific filtering)
   * @param companyId - Company ID
   * @returns Array of objectives for the company
   */
  static async getByCompanyId(companyId: string): Promise<Objective[]> {
    try {
      const result = await this.db
        .select({
          objective: objectives,
          ownerName: profiles.fullName,
          ownerRole: profiles.roleType,
        })
        .from(objectives)
        .leftJoin(profiles, eq(objectives.ownerId, profiles.userId))
        .where(eq(objectives.companyId, companyId))
        .orderBy(desc(objectives.createdAt));

      return result.map(row => this.toDomainModel(row.objective, row.ownerName || undefined, row.ownerRole || undefined));
    } catch (error) {
      console.error('Error fetching objectives by company ID:', error);
      throw error;
    }
  }

  /**
   * Get objectives by department (for department-specific filtering)
   * @param department - Department name
   * @returns Array of objectives for the department
   */
  static async getByDepartment(department: string): Promise<Objective[]> {
    try {
      const result = await this.db
        .select({
          objective: objectives,
          ownerName: profiles.fullName,
          ownerRole: profiles.roleType,
        })
        .from(objectives)
        .leftJoin(profiles, eq(objectives.ownerId, profiles.userId))
        .where(eq(objectives.department, department))
        .orderBy(desc(objectives.createdAt));

      return result.map(row => this.toDomainModel(row.objective, row.ownerName || undefined, row.ownerRole || undefined));
    } catch (error) {
      console.error('Error fetching objectives by department:', error);
      throw error;
    }
  }

  /**
   * Get objectives by status (for status-based filtering)
   * @param status - Objective status
   * @returns Array of objectives with the specified status
   */
  static async getByStatus(status: Objective['status']): Promise<Objective[]> {
    try {
      const result = await this.db
        .select({
          objective: objectives,
          ownerName: profiles.fullName,
          ownerRole: profiles.roleType,
        })
        .from(objectives)
        .leftJoin(profiles, eq(objectives.ownerId, profiles.userId))
        .where(eq(objectives.status, status))
        .orderBy(desc(objectives.createdAt));

      return result.map(row => this.toDomainModel(row.objective, row.ownerName || undefined, row.ownerRole || undefined));
    } catch (error) {
      console.error('Error fetching objectives by status:', error);
      throw error;
    }
  }
}