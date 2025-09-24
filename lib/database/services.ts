// Import all repositories for clean service layer integration
import { ProfilesRepository, type Profile } from './queries/profiles';
import { ObjectivesRepository, type Objective } from './queries/objectives';
import { InitiativesRepository, type InitiativeWithRelations } from './queries/initiatives';
import { ActivitiesRepository, type Activity } from './queries/activities';
import type { FilterParams } from './queries/objectives';

// Legacy imports for backward compatibility during transition
import { query, transaction } from './client';
import type { QueryResult } from 'pg';

// Re-export types from repositories for API compatibility
export type { Objective } from './queries/objectives';
export type { InitiativeWithRelations as Initiative } from './queries/initiatives';
export type { Activity } from './queries/activities';
export type { Profile } from './queries/profiles';
export type { FilterParams } from './queries/objectives';

// Company interface remains for CompaniesService (no repository yet)
export interface Company {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  size?: string;
  created_at: string;
  updated_at: string;
}

// Objectives Service - Now uses ObjectivesRepository with maintained API compatibility
export class ObjectivesService {
  /**
   * Get all objectives with role-based filtering - delegates to repository
   */
  static async getAll(userId: string, userRole: string, userDepartment: string): Promise<Objective[]> {
    const filterParams: FilterParams = {
      userId,
      userRole,
      userDepartment,
    };
    return ObjectivesRepository.getAll(filterParams);
  }

  /**
   * Get objective by ID - delegates to repository
   */
  static async getById(id: string, userId: string): Promise<Objective | null> {
    return ObjectivesRepository.getById(id, userId);
  }

  /**
   * Create a new objective - delegates to repository
   */
  static async create(objective: Omit<Objective, 'id' | 'created_at' | 'updated_at' | 'owner'>): Promise<Objective> {
    return ObjectivesRepository.create(objective);
  }

  /**
   * Update an existing objective - delegates to repository
   */
  static async update(id: string, updates: Partial<Objective>): Promise<Objective> {
    return ObjectivesRepository.update(id, updates);
  }

  /**
   * Delete an objective - delegates to repository
   */
  static async delete(id: string): Promise<void> {
    return ObjectivesRepository.delete(id);
  }
}

// Initiatives Service - Now uses InitiativesRepository with maintained API compatibility
export class InitiativesService {
  private static repository = new InitiativesRepository();

  /**
   * Get initiatives by objective ID - delegates to repository
   */
  static async getByObjectiveId(objectiveId: string): Promise<Initiative[]> {
    return this.repository.getByObjectiveId(objectiveId);
  }

  /**
   * Get all initiatives with role-based filtering - delegates to repository
   */
  static async getAll(userId: string, userRole: string, userDepartment: string): Promise<Initiative[]> {
    const filterParams: FilterParams = {
      userId,
      userRole,
      userDepartment,
    };
    return this.repository.getAll(filterParams);
  }

  /**
   * Create a new initiative - delegates to repository
   */
  static async create(initiative: Omit<Initiative, 'id' | 'created_at' | 'updated_at' | 'owner' | 'objective_title' | 'activities'>): Promise<Initiative> {
    return this.repository.create(initiative);
  }

  /**
   * Update an existing initiative - delegates to repository
   */
  static async update(id: string, updates: Partial<Initiative>): Promise<Initiative> {
    return this.repository.update(id, updates);
  }

  /**
   * Delete an initiative - delegates to repository
   */
  static async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }
}

// Activities Service - Now uses ActivitiesRepository with maintained API compatibility
export class ActivitiesService {
  /**
   * Get activities by initiative ID - delegates to repository
   */
  static async getByInitiativeId(initiativeId: string): Promise<Activity[]> {
    return ActivitiesRepository.getByInitiativeId(initiativeId);
  }

  /**
   * Get all activities with role-based filtering - delegates to repository
   */
  static async getAll(userId: string, userRole: string, userDepartment: string): Promise<Activity[]> {
    const filterParams: FilterParams = {
      userId,
      userRole,
      userDepartment,
    };
    return ActivitiesRepository.getAll(filterParams);
  }

  /**
   * Create a new activity - delegates to repository
   */
  static async create(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at' | 'assignee' | 'initiative_title' | 'objective_title'>): Promise<Activity> {
    return ActivitiesRepository.create(activity);
  }

  /**
   * Update an existing activity - delegates to repository
   */
  static async update(id: string, updates: Partial<Activity>): Promise<Activity> {
    return ActivitiesRepository.update(id, updates);
  }

  /**
   * Delete an activity - delegates to repository
   */
  static async delete(id: string): Promise<void> {
    return ActivitiesRepository.delete(id);
  }
}

// Profiles Service - Now uses ProfilesRepository with maintained API compatibility
export class ProfilesService {
  /**
   * Get profile by user ID - delegates to repository
   */
  static async getByUserId(userId: string): Promise<Profile | null> {
    return ProfilesRepository.getByUserId(userId);
  }

  /**
   * Get all profiles, optionally filtered by company - delegates to repository
   */
  static async getAll(companyId?: string): Promise<Profile[]> {
    return ProfilesRepository.getAll(companyId);
  }

  /**
   * Create a new profile - delegates to repository
   */
  static async create(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
    return ProfilesRepository.create(profile);
  }

  /**
   * Update an existing profile - delegates to repository
   */
  static async update(userId: string, updates: Partial<Profile>): Promise<Profile> {
    return ProfilesRepository.update(userId, updates);
  }
}

// Companies Service
export class CompaniesService {
  static async getAll(): Promise<Company[]> {
    const result = await query<Company>(
      'SELECT * FROM companies ORDER BY name ASC'
    );
    return result.rows;
  }

  static async getById(id: string): Promise<Company | null> {
    const result = await query<Company>(
      'SELECT * FROM companies WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    const result = await query<Company>(
      `INSERT INTO companies (name, description, industry, size)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [company.name, company.description, company.industry, company.size]
    );
    return result.rows[0];
  }

  static async update(id: string, updates: Partial<Company>): Promise<Company> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updates), new Date().toISOString()];

    const result = await query<Company>(
      `UPDATE companies SET ${setClause}, updated_at = $${values.length} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM companies WHERE id = $1', [id]);
  }
}