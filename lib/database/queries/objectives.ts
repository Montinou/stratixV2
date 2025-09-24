import { eq, and, desc, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../client';
import { objectives, profiles, companies, initiatives } from '../schema';
import type { 
  Objective, 
  InsertObjective, 
  UpdateObjective,
  ObjectiveWithOwner,
  ObjectiveWithRelations,
  UserRole 
} from '../types';

export class ObjectivesRepository {
  private db = getDrizzleDb();

  /**
   * Get all objectives with role-based filtering
   * Maintains exact API compatibility with existing ObjectivesService.getAll
   */
  async getAll(userId: string, userRole: UserRole, userDepartment: string): Promise<ObjectiveWithOwner[]> {
    try {
      let query = this.db
        .select({
          id: objectives.id,
          title: objectives.title,
          description: objectives.description,
          department: objectives.department,
          status: objectives.status,
          priority: objectives.priority,
          progress: objectives.progress,
          startDate: objectives.startDate,
          endDate: objectives.endDate,
          ownerId: objectives.ownerId,
          companyId: objectives.companyId,
          createdAt: objectives.createdAt,
          updatedAt: objectives.updatedAt,
          // Owner profile information (maintaining compatibility with legacy query)
          owner_name: profiles.fullName,
          owner_role: profiles.roleType,
        })
        .from(objectives)
        .leftJoin(profiles, eq(objectives.ownerId, profiles.userId))
        .orderBy(desc(objectives.createdAt));

      // Apply role-based filtering (exactly as in existing service)
      if (userRole === 'empleado') {
        query = query.where(eq(objectives.ownerId, userId));
      } else if (userRole === 'gerente') {
        query = query.where(eq(objectives.department, userDepartment));
      }

      const results = await query;

      // Transform results to maintain API compatibility
      return results.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        department: row.department,
        status: row.status,
        priority: row.priority,
        progress: row.progress ?? 0,
        start_date: row.startDate.toISOString(),
        end_date: row.endDate.toISOString(),
        owner_id: row.ownerId,
        company_id: row.companyId,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
        // Include owner information if available
        owner: row.owner_name ? {
          user_id: row.ownerId,
          full_name: row.owner_name,
          role_type: row.owner_role!,
          department: row.department,
          company_id: row.companyId,
          created_at: row.createdAt.toISOString(),
          updated_at: row.updatedAt.toISOString(),
        } : undefined
      }));

    } catch (error) {
      console.error('Error fetching objectives:', error);
      throw error;
    }
  }

  /**
   * Get objective by ID with owner relations
   * Maintains exact API compatibility with existing ObjectivesService.getById
   */
  async getById(id: string, userId: string): Promise<ObjectiveWithOwner | null> {
    try {
      const results = await this.db
        .select({
          id: objectives.id,
          title: objectives.title,
          description: objectives.description,
          department: objectives.department,
          status: objectives.status,
          priority: objectives.priority,
          progress: objectives.progress,
          startDate: objectives.startDate,
          endDate: objectives.endDate,
          ownerId: objectives.ownerId,
          companyId: objectives.companyId,
          createdAt: objectives.createdAt,
          updatedAt: objectives.updatedAt,
          // Owner profile information
          owner_name: profiles.fullName,
          owner_role: profiles.roleType,

        })
        .from(objectives)
        .leftJoin(profiles, eq(objectives.ownerId, profiles.userId))
        .where(eq(objectives.id, id))
        .limit(1);


      if (results.length === 0) {
        return null;
      }

      const row = results[0];

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        department: row.department,
        status: row.status,
        priority: row.priority,
        progress: row.progress ?? 0,
        start_date: row.startDate.toISOString(),
        end_date: row.endDate.toISOString(),
        owner_id: row.ownerId,
        company_id: row.companyId,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
        // Include owner information if available
        owner: row.owner_name ? {
          user_id: row.ownerId,
          full_name: row.owner_name,
          role_type: row.owner_role!,
          department: row.department,
          company_id: row.companyId,
          created_at: row.createdAt.toISOString(),
          updated_at: row.updatedAt.toISOString(),
        } : undefined
      };


    } catch (error) {
      console.error('Error fetching objective by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new objective
   * Maintains exact API compatibility with existing ObjectivesService.create
   */
  async create(objectiveData: Omit<InsertObjective, 'id' | 'createdAt' | 'updatedAt'>): Promise<Objective> {
    try {
      const results = await this.db
        .insert(objectives)
        .values({
          title: objectiveData.title,
          description: objectiveData.description,
          department: objectiveData.department,
          status: objectiveData.status ?? 'draft',
          priority: objectiveData.priority ?? 'medium',
          progress: objectiveData.progress ?? 0,
          startDate: new Date(objectiveData.startDate),
          endDate: new Date(objectiveData.endDate),
          ownerId: objectiveData.ownerId,
          companyId: objectiveData.companyId,
        })
        .returning();

      const created = results[0];

      // Transform to maintain API compatibility with legacy interface
      return {
        id: created.id,
        title: created.title,
        description: created.description,
        department: created.department,
        status: created.status,
        priority: created.priority,
        progress: created.progress ?? 0,
        start_date: created.startDate.toISOString(),
        end_date: created.endDate.toISOString(),
        owner_id: created.ownerId,
        company_id: created.companyId,
        created_at: created.createdAt.toISOString(),
        updated_at: created.updatedAt.toISOString(),
      };


    } catch (error) {
      console.error('Error creating objective:', error);
      throw error;
  }

  /**
   * Update an existing objective
   * Maintains exact API compatibility with existing ObjectivesService.update
   */
  async update(id: string, updates: UpdateObjective): Promise<Objective> {
    try {
      // Build update object with proper date conversion
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Only include fields that are actually being updated
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.department !== undefined) updateData.department = updates.department;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.startDate !== undefined) updateData.startDate = new Date(updates.startDate);
      if (updates.endDate !== undefined) updateData.endDate = new Date(updates.endDate);
      if (updates.ownerId !== undefined) updateData.ownerId = updates.ownerId;
      if (updates.companyId !== undefined) updateData.companyId = updates.companyId;

      const results = await this.db
        .update(objectives)
        .set(updateData)
        .where(eq(objectives.id, id))
        .returning();

      if (results.length === 0) {
        throw new Error(`Objective with ID ${id} not found`);
      }

      const updated = results[0];

      // Transform to maintain API compatibility with legacy interface
      return {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        department: updated.department,
        status: updated.status,
        priority: updated.priority,
        progress: updated.progress ?? 0,
        start_date: updated.startDate.toISOString(),
        end_date: updated.endDate.toISOString(),
        owner_id: updated.ownerId,
        company_id: updated.companyId,
        created_at: updated.createdAt.toISOString(),
        updated_at: updated.updatedAt.toISOString(),
      };

    } catch (error) {
      console.error('Error updating objective:', error);
      throw error;
    }
  }

  /**
   * Delete an objective
   * Maintains exact API compatibility with existing ObjectivesService.delete
   */
  async delete(id: string): Promise<void> {

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
   * Get objective with full relations (initiatives and activities)
   * New method for enhanced functionality while maintaining backward compatibility
   */
  async getByIdWithRelations(id: string): Promise<ObjectiveWithRelations | null> {
    try {
      const objectiveWithOwner = await this.getById(id, ''); // Pass empty userId since this is a new method

      if (!objectiveWithOwner) {
        return null;
      }

      // Get related initiatives (could be extracted to InitiativesRepository later)
      const relatedInitiatives = await this.db
        .select({
          id: initiatives.id,
          objectiveId: initiatives.objectiveId,
          title: initiatives.title,
          description: initiatives.description,
          status: initiatives.status,
          priority: initiatives.priority,
          progress: initiatives.progress,
          startDate: initiatives.startDate,
          endDate: initiatives.endDate,
          ownerId: initiatives.ownerId,
          createdAt: initiatives.createdAt,
          updatedAt: initiatives.updatedAt,
        })
        .from(initiatives)
        .where(eq(initiatives.objectiveId, id))
        .orderBy(desc(initiatives.createdAt));

      return {
        ...objectiveWithOwner,
        initiatives: relatedInitiatives.map(init => ({
          id: init.id,
          objective_id: init.objectiveId,
          title: init.title,
          description: init.description,
          status: init.status,
          priority: init.priority,
          progress: init.progress ?? 0,
          start_date: init.startDate.toISOString(),
          end_date: init.endDate.toISOString(),
          owner_id: init.ownerId,
          created_at: init.createdAt.toISOString(),
          updated_at: init.updatedAt.toISOString(),
        }))
      };

    } catch (error) {
      console.error('Error fetching objective with relations:', error);
      throw error;
    }
  }

  /**
   * Get objectives count by status for analytics
   * Helper method for dashboard statistics
   */
  async getCountByStatus(userId: string, userRole: UserRole, userDepartment: string): Promise<Record<string, number>> {
    try {
      let query = this.db
        .select({
          status: objectives.status,
          count: sql<number>`count(*)`.as('count')
        })
        .from(objectives)
        .groupBy(objectives.status);

      // Apply same role-based filtering as getAll method
      if (userRole === 'empleado') {
        query = query.where(eq(objectives.ownerId, userId));
      } else if (userRole === 'gerente') {
        query = query.where(eq(objectives.department, userDepartment));
      }

      const results = await query;

      // Transform to simple object
      const counts: Record<string, number> = {};
      results.forEach(row => {
        counts[row.status] = Number(row.count);
      });

      return counts;

    } catch (error) {
      console.error('Error getting objectives count by status:', error);
      throw error;
    }
  }
}