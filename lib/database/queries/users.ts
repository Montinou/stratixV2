import { eq, desc, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../client';
import { users, profiles, companies } from '../schema';
import type { 
  User, 
  InsertUser, 
  UpdateUser,
  Profile,
  Company,
  UserRole 
} from '../types';

export interface UserWithProfile extends User {
  profile?: Profile;
  company?: Company;
}

export class UsersRepository {
  private db = getDrizzleDb();

  /**
   * Get user by ID
   * Basic user lookup for authentication and validation
   */
  async getById(id: string): Promise<User | null> {
    try {
      const results = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return results.length > 0 ? results[0] : null;

    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by email
   * Used for authentication and user lookup
   */
  async getByEmail(email: string): Promise<User | null> {
    try {
      const results = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return results.length > 0 ? results[0] : null;

    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  }

  /**
   * Get user with profile and company information
   * Used for complete user context in authentication
   */
  async getByIdWithProfile(id: string): Promise<UserWithProfile | null> {
    try {
      const results = await this.db
        .select({
          // User fields
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          emailConfirmed: users.emailConfirmed,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          // Profile fields
          profile_userId: profiles.userId,
          profile_fullName: profiles.fullName,
          profile_roleType: profiles.roleType,
          profile_department: profiles.department,
          profile_companyId: profiles.companyId,
          profile_createdAt: profiles.createdAt,
          profile_updatedAt: profiles.updatedAt,
          // Company fields
          company_id: companies.id,
          company_name: companies.name,
          company_description: companies.description,
          company_industry: companies.industry,
          company_size: companies.size,
          company_createdAt: companies.createdAt,
          company_updatedAt: companies.updatedAt,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .leftJoin(companies, eq(profiles.companyId, companies.id))
        .where(eq(users.id, id))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];

      return {
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        emailConfirmed: row.emailConfirmed,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // Include profile if exists
        profile: row.profile_userId ? {
          userId: row.profile_userId,
          fullName: row.profile_fullName!,
          roleType: row.profile_roleType!,
          department: row.profile_department!,
          companyId: row.profile_companyId!,
          createdAt: row.profile_createdAt!,
          updatedAt: row.profile_updatedAt!,
        } : undefined,
        // Include company if exists
        company: row.company_id ? {
          id: row.company_id,
          name: row.company_name!,
          description: row.company_description,
          industry: row.company_industry,
          size: row.company_size,
          createdAt: row.company_createdAt!,
          updatedAt: row.company_updatedAt!,
        } : undefined
      };

    } catch (error) {
      console.error('Error fetching user with profile:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   * Used during user registration and Stack Auth integration
   */
  async create(userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const results = await this.db
        .insert(users)
        .values({
          email: userData.email,
          passwordHash: userData.passwordHash,
          emailConfirmed: userData.emailConfirmed,
        })
        .returning();

      const created = results[0];

      return {
        id: created.id,
        email: created.email,
        passwordHash: created.passwordHash,
        emailConfirmed: created.emailConfirmed,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };

    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Create user with specific ID (for Stack Auth integration)
   * Used when Stack Auth provides the user ID
   */
  async createWithId(id: string, userData: Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const results = await this.db
        .insert(users)
        .values({
          id,
          email: userData.email,
          passwordHash: userData.passwordHash,
          emailConfirmed: userData.emailConfirmed,
        })
        .returning();

      const created = results[0];

      return {
        id: created.id,
        email: created.email,
        passwordHash: created.passwordHash,
        emailConfirmed: created.emailConfirmed,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };

    } catch (error) {
      console.error('Error creating user with ID:', error);
      throw error;
    }
  }

  /**
   * Update an existing user
   * Maintains exact API compatibility for user updates
   */
  async update(id: string, updates: UpdateUser): Promise<User> {
    try {
      // Build update object
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Only include fields that are actually being updated
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.passwordHash !== undefined) updateData.passwordHash = updates.passwordHash;
      if (updates.emailConfirmed !== undefined) updateData.emailConfirmed = updates.emailConfirmed;

      const results = await this.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();

      if (results.length === 0) {
        throw new Error(`User with ID ${id} not found`);
      }

      const updated = results[0];

      return {
        id: updated.id,
        email: updated.email,
        passwordHash: updated.passwordHash,
        emailConfirmed: updated.emailConfirmed,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };

    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   * Used for account cleanup (will cascade delete profile)
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db
        .delete(users)
        .where(eq(users.id, id));

    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin function)
   * Used for user management in admin panels
   */
  async getAll(limit?: number, offset?: number): Promise<UserWithProfile[]> {
    try {
      let query = this.db
        .select({
          // User fields
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          emailConfirmed: users.emailConfirmed,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          // Profile fields
          profile_userId: profiles.userId,
          profile_fullName: profiles.fullName,
          profile_roleType: profiles.roleType,
          profile_department: profiles.department,
          profile_companyId: profiles.companyId,
          profile_createdAt: profiles.createdAt,
          profile_updatedAt: profiles.updatedAt,
          // Company fields
          company_id: companies.id,
          company_name: companies.name,
          company_description: companies.description,
          company_industry: companies.industry,
          company_size: companies.size,
          company_createdAt: companies.createdAt,
          company_updatedAt: companies.updatedAt,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .leftJoin(companies, eq(profiles.companyId, companies.id))
        .orderBy(desc(users.createdAt));

      // Apply pagination if provided
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.offset(offset);
      }

      const results = await query;

      return results.map(row => ({
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        emailConfirmed: row.emailConfirmed,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // Include profile if exists
        profile: row.profile_userId ? {
          userId: row.profile_userId,
          fullName: row.profile_fullName!,
          roleType: row.profile_roleType!,
          department: row.profile_department!,
          companyId: row.profile_companyId!,
          createdAt: row.profile_createdAt!,
          updatedAt: row.profile_updatedAt!,
        } : undefined,
        // Include company if exists
        company: row.company_id ? {
          id: row.company_id,
          name: row.company_name!,
          description: row.company_description,
          industry: row.company_industry,
          size: row.company_size,
          createdAt: row.company_createdAt!,
          updatedAt: row.company_updatedAt!,
        } : undefined
      }));

    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  /**
   * Confirm user email
   * Used during email verification process
   */
  async confirmEmail(id: string): Promise<User> {
    try {
      const results = await this.db
        .update(users)
        .set({
          emailConfirmed: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (results.length === 0) {
        throw new Error(`User with ID ${id} not found`);
      }

      return results[0];

    } catch (error) {
      console.error('Error confirming user email:', error);
      throw error;
    }
  }

  /**
   * Create or update user for Stack Auth integration
   * Ensures user exists in database when coming from Stack Auth
   */
  async createOrUpdate(id: string, userData: {
    email: string;
    emailConfirmed?: Date | null;
  }): Promise<User> {
    try {
      // Check if user already exists
      const existing = await this.getById(id);
      
      if (existing) {
        // Update existing user
        return await this.update(id, {
          email: userData.email,
          emailConfirmed: userData.emailConfirmed,
        });
      } else {
        // Create new user with Stack Auth ID
        return await this.createWithId(id, {
          email: userData.email,
          passwordHash: null, // Stack Auth manages passwords
          emailConfirmed: userData.emailConfirmed,
        });
      }

    } catch (error) {
      console.error('Error creating or updating user:', error);
      throw error;
    }
  }

  /**
   * Get users count for analytics
   * Used for dashboard statistics
   */
  async getCount(): Promise<number> {
    try {
      const results = await this.db
        .select({
          count: sql<number>`count(*)`.as('count')
        })
        .from(users);

      return Number(results[0]?.count || 0);

    } catch (error) {
      console.error('Error getting users count:', error);
      throw error;
    }
  }

  /**
   * Search users by email (partial match)
   * Used for admin user search functionality
   */
  async searchByEmail(searchTerm: string, limit?: number): Promise<UserWithProfile[]> {
    try {
      let query = this.db
        .select({
          // User fields
          id: users.id,
          email: users.email,
          passwordHash: users.passwordHash,
          emailConfirmed: users.emailConfirmed,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          // Profile fields
          profile_userId: profiles.userId,
          profile_fullName: profiles.fullName,
          profile_roleType: profiles.roleType,
          profile_department: profiles.department,
          profile_companyId: profiles.companyId,
          profile_createdAt: profiles.createdAt,
          profile_updatedAt: profiles.updatedAt,
          // Company fields
          company_id: companies.id,
          company_name: companies.name,
          company_description: companies.description,
          company_industry: companies.industry,
          company_size: companies.size,
          company_createdAt: companies.createdAt,
          company_updatedAt: companies.updatedAt,
        })
        .from(users)
        .leftJoin(profiles, eq(users.id, profiles.userId))
        .leftJoin(companies, eq(profiles.companyId, companies.id))
        .where(sql`${users.email} ILIKE ${`%${searchTerm}%`}`)
        .orderBy(desc(users.createdAt));

      if (limit) {
        query = query.limit(limit);
      }

      const results = await query;

      return results.map(row => ({
        id: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
        emailConfirmed: row.emailConfirmed,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // Include profile if exists
        profile: row.profile_userId ? {
          userId: row.profile_userId,
          fullName: row.profile_fullName!,
          roleType: row.profile_roleType!,
          department: row.profile_department!,
          companyId: row.profile_companyId!,
          createdAt: row.profile_createdAt!,
          updatedAt: row.profile_updatedAt!,
        } : undefined,
        // Include company if exists
        company: row.company_id ? {
          id: row.company_id,
          name: row.company_name!,
          description: row.company_description,
          industry: row.company_industry,
          size: row.company_size,
          createdAt: row.company_createdAt!,
          updatedAt: row.company_updatedAt!,
        } : undefined
      }));

    } catch (error) {
      console.error('Error searching users by email:', error);
      throw error;
    }
  }
}