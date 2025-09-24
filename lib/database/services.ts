import { query, transaction } from './client';
import type { QueryResult } from 'pg';

// Types for database entities
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
  owner?: Profile;
}

export interface Initiative {
  id: string;
  objective_id: string;
  title: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  start_date: string;
  end_date: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  progress?: number;
  owner?: Profile;
}

export interface Activity {
  id: string;
  initiative_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'corporativo' | 'gerente' | 'empleado';
  department: string | null;
  manager_id: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: any;
  created_at: string;
  updated_at: string;
}

// Objectives Service
export class ObjectivesService {
  static async getAll(userId: string, userRole: string, userDepartment: string): Promise<Objective[]> {
    let queryText = `
      SELECT 
        o.*,
        p.full_name as owner_name,
        p.role_type as owner_role
      FROM objectives o
      LEFT JOIN profiles p ON o.owner_id = p.user_id
    `;
    let params: string[] = [];

    // Apply role-based filtering
    if (userRole === 'empleado') {
      queryText += ' WHERE o.owner_id = $1';
      params = [userId];
    } else if (userRole === 'gerente') {
      queryText += ' WHERE o.department = $1';
      params = [userDepartment];
    }

    queryText += ' ORDER BY o.created_at DESC';

    const result = await query<Objective>(queryText, params);
    return result.rows;
  }

  static async getById(id: string, userId: string): Promise<Objective | null> {
    const result = await query<Objective>(
      `SELECT 
        o.*,
        p.full_name as owner_name,
        p.role_type as owner_role
       FROM objectives o
       LEFT JOIN profiles p ON o.owner_id = p.user_id
       WHERE o.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(objective: Omit<Objective, 'id' | 'created_at' | 'updated_at'>): Promise<Objective> {
    const result = await query<Objective>(
      `INSERT INTO objectives (
        title, description, department, status, priority, 
        start_date, end_date, owner_id, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        objective.title,
        objective.description,
        objective.department,
        objective.status,
        objective.priority,
        objective.start_date,
        objective.end_date,
        objective.owner_id,
        objective.company_id
      ]
    );
    return result.rows[0];
  }

  static async update(id: string, updates: Partial<Objective>): Promise<Objective> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updates), new Date().toISOString()];

    const result = await query<Objective>(
      `UPDATE objectives SET ${setClause}, updated_at = $${values.length} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM objectives WHERE id = $1', [id]);
  }
}

// Initiatives Service
export class InitiativesService {
  static async getByObjectiveId(objectiveId: string): Promise<Initiative[]> {
    const result = await query<Initiative>(
      `SELECT 
        i.*,
        p.full_name as owner_name,
        p.role_type as owner_role
       FROM initiatives i
       LEFT JOIN profiles p ON i.owner_id = p.user_id
       WHERE i.objective_id = $1
       ORDER BY i.created_at DESC`,
      [objectiveId]
    );
    return result.rows;
  }

  static async getAll(userId: string, userRole: string, userDepartment: string): Promise<Initiative[]> {
    let queryText = `
      SELECT 
        i.*,
        p.full_name as owner_name,
        p.role_type as owner_role,
        o.title as objective_title
      FROM initiatives i
      LEFT JOIN profiles p ON i.owner_id = p.user_id
      LEFT JOIN objectives o ON i.objective_id = o.id
    `;
    let params: string[] = [];

    // Apply role-based filtering through objectives
    if (userRole === 'empleado') {
      queryText += ' WHERE o.owner_id = $1';
      params = [userId];
    } else if (userRole === 'gerente') {
      queryText += ' WHERE o.department = $1';
      params = [userDepartment];
    }

    queryText += ' ORDER BY i.created_at DESC';

    const result = await query<Initiative>(queryText, params);
    return result.rows;
  }

  static async create(initiative: Omit<Initiative, 'id' | 'created_at' | 'updated_at'>): Promise<Initiative> {
    const result = await query<Initiative>(
      `INSERT INTO initiatives (
        objective_id, title, description, status, priority,
        start_date, end_date, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        initiative.objective_id,
        initiative.title,
        initiative.description,
        initiative.status,
        initiative.priority,
        initiative.start_date,
        initiative.end_date,
        initiative.owner_id
      ]
    );
    return result.rows[0];
  }

  static async update(id: string, updates: Partial<Initiative>): Promise<Initiative> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updates), new Date().toISOString()];

    const result = await query<Initiative>(
      `UPDATE initiatives SET ${setClause}, updated_at = $${values.length} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM initiatives WHERE id = $1', [id]);
  }
}

// Activities Service
export class ActivitiesService {
  static async getByInitiativeId(initiativeId: string): Promise<Activity[]> {
    const result = await query<Activity>(
      `SELECT 
        a.*,
        p.full_name as assignee_name,
        p.role_type as assignee_role
       FROM activities a
       LEFT JOIN profiles p ON a.assigned_to = p.user_id
       WHERE a.initiative_id = $1
       ORDER BY a.due_date ASC`,
      [initiativeId]
    );
    return result.rows;
  }

  static async getAll(userId: string, userRole: string, userDepartment: string): Promise<Activity[]> {
    let queryText = `
      SELECT 
        a.*,
        p.full_name as assignee_name,
        p.role_type as assignee_role,
        i.title as initiative_title,
        o.title as objective_title
      FROM activities a
      LEFT JOIN profiles p ON a.assigned_to = p.user_id
      LEFT JOIN initiatives i ON a.initiative_id = i.id
      LEFT JOIN objectives o ON i.objective_id = o.id
    `;
    let params: string[] = [];

    // Apply role-based filtering
    if (userRole === 'empleado') {
      queryText += ' WHERE (a.assigned_to = $1 OR o.owner_id = $1)';
      params = [userId];
    } else if (userRole === 'gerente') {
      queryText += ' WHERE o.department = $1';
      params = [userDepartment];
    }

    queryText += ' ORDER BY a.due_date ASC';

    const result = await query<Activity>(queryText, params);
    return result.rows;
  }

  static async create(activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>): Promise<Activity> {
    const result = await query<Activity>(
      `INSERT INTO activities (
        initiative_id, title, description, status, priority,
        due_date, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        activity.initiative_id,
        activity.title,
        activity.description,
        activity.status,
        activity.priority,
        activity.due_date,
        activity.assigned_to
      ]
    );
    return result.rows[0];
  }

  static async update(id: string, updates: Partial<Activity>): Promise<Activity> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updates), new Date().toISOString()];

    const result = await query<Activity>(
      `UPDATE activities SET ${setClause}, updated_at = $${values.length} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id: string): Promise<void> {
    await query('DELETE FROM activities WHERE id = $1', [id]);
  }
}

// Profiles Service
export class ProfilesService {
  static async getByUserId(userId: string): Promise<Profile | null> {
    const result = await query<Profile>(
      'SELECT * FROM profiles WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  static async getAll(companyId?: string): Promise<Profile[]> {
    let queryText = 'SELECT * FROM profiles';
    let params: string[] = [];

    if (companyId) {
      queryText += ' WHERE company_id = $1';
      params = [companyId];
    }

    queryText += ' ORDER BY full_name ASC';

    const result = await query<Profile>(queryText, params);
    return result.rows;
  }

  static async create(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
    const result = await query<Profile>(
      `INSERT INTO profiles (
        id, email, full_name, role, department, manager_id, company_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        profile.id,
        profile.email,
        profile.full_name,
        profile.role,
        profile.department,
        profile.manager_id,
        profile.company_id
      ]
    );
    return result.rows[0];
  }

  static async update(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [userId, ...Object.values(updates), new Date().toISOString()];

    const result = await query<Profile>(
      `UPDATE profiles SET ${setClause}, updated_at = $${values.length} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
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
      `INSERT INTO companies (name, slug, logo_url, settings)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [company.name, company.slug, company.logo_url, company.settings]
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