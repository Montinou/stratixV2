import { eq, and } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { profiles, companies, type Profile as DrizzleProfile, type InsertProfile } from '../schema';

// Interface to match existing services.ts Profile for API compatibility
export interface Profile {
  user_id: string;
  full_name: string;
  role_type: 'corporativo' | 'gerente' | 'empleado';
  department: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * ProfilesRepository - Type-safe repository for profile operations using Drizzle ORM
 * 
 * Maintains exact API compatibility with existing ProfilesService while using
 * Drizzle ORM for type safety and better query performance.
 */
export class ProfilesRepository {
  private static db = getDrizzleClient();

  /**
   * Convert Drizzle profile to service API format
   */
  private static toDomainModel(drizzleProfile: DrizzleProfile): Profile {
    return {
      user_id: drizzleProfile.userId,
      full_name: drizzleProfile.fullName,
      role_type: drizzleProfile.roleType,
      department: drizzleProfile.department,
      company_id: drizzleProfile.companyId,
      created_at: drizzleProfile.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: drizzleProfile.updatedAt?.toISOString() || new Date().toISOString(),
    };
  }

  /**
   * Convert service API format to Drizzle insert format
   */
  private static toDbModel(profile: Omit<Profile, 'created_at' | 'updated_at'>): InsertProfile {
    return {
      userId: profile.user_id,
      fullName: profile.full_name,
      roleType: profile.role_type,
      department: profile.department,
      companyId: profile.company_id,
    };
  }

  /**
   * Get profile by user ID
   * @param userId - User ID to lookup
   * @returns Profile or null if not found
   */
  static async getByUserId(userId: string): Promise<Profile | null> {
    try {
      const result = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error fetching profile by user ID:', error);
      throw error;
    }
  }

  /**
   * Get all profiles, optionally filtered by company
   * @param companyId - Optional company ID filter
   * @returns Array of profiles
   */
  static async getAll(companyId?: string): Promise<Profile[]> {
    try {
      let result;
      
      if (companyId) {
        result = await this.db
          .select()
          .from(profiles)
          .where(eq(profiles.companyId, companyId))
          .orderBy(profiles.fullName);
      } else {
        result = await this.db
          .select()
          .from(profiles)
          .orderBy(profiles.fullName);
      }
      
      return result.map(profile => this.toDomainModel(profile));
    } catch (error) {
      console.error('Error fetching all profiles:', error);
      throw error;
    }
  }

  /**
   * Create a new profile
   * @param profile - Profile data (without timestamps)
   * @returns Created profile
   */
  static async create(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile> {
    try {
      const dbProfile = this.toDbModel(profile);
      
      const result = await this.db
        .insert(profiles)
        .values(dbProfile)
        .returning();

      if (result.length === 0) {
        throw new Error('Failed to create profile');
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Update an existing profile
   * @param userId - User ID of profile to update
   * @param updates - Partial profile updates
   * @returns Updated profile
   */
  static async update(userId: string, updates: Partial<Profile>): Promise<Profile> {
    try {
      // Convert updates to database format
      const dbUpdates: Partial<InsertProfile> = {};
      
      if (updates.full_name !== undefined) {
        dbUpdates.fullName = updates.full_name;
      }
      if (updates.role_type !== undefined) {
        dbUpdates.roleType = updates.role_type;
      }
      if (updates.department !== undefined) {
        dbUpdates.department = updates.department;
      }
      if (updates.company_id !== undefined) {
        dbUpdates.companyId = updates.company_id;
      }

      const result = await this.db
        .update(profiles)
        .set(dbUpdates)
        .where(eq(profiles.userId, userId))
        .returning();

      if (result.length === 0) {
        throw new Error(`Profile with user_id ${userId} not found`);
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Get profile with company information (for extended queries)
   * @param userId - User ID to lookup
   * @returns Profile with company data or null if not found
   */
  static async getByUserIdWithCompany(userId: string): Promise<(Profile & { company_name?: string }) | null> {
    try {
      const result = await this.db
        .select({
          profile: profiles,
          companyName: companies.name,
        })
        .from(profiles)
        .leftJoin(companies, eq(profiles.companyId, companies.id))
        .where(eq(profiles.userId, userId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const profile = this.toDomainModel(result[0].profile);
      return {
        ...profile,
        company_name: result[0].companyName || undefined,
      };
    } catch (error) {
      console.error('Error fetching profile with company:', error);
      throw error;
    }
  }

  /**
   * Get profiles by role within a company (for role-based filtering)
   * @param companyId - Company ID
   * @param role - User role to filter by
   * @returns Array of profiles matching the role
   */
  static async getByRole(companyId: string, role: Profile['role_type']): Promise<Profile[]> {
    try {
      const result = await this.db
        .select()
        .from(profiles)
        .where(and(eq(profiles.companyId, companyId), eq(profiles.roleType, role)))
        .orderBy(profiles.fullName);

      return result.map(profile => this.toDomainModel(profile));
    } catch (error) {
      console.error('Error fetching profiles by role:', error);
      throw error;
    }
  }

  /**
   * Check if a profile exists
   * @param userId - User ID to check
   * @returns Boolean indicating if profile exists
   */
  static async exists(userId: string): Promise<boolean> {
    try {
      const result = await this.db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error('Error checking profile existence:', error);
      throw error;
    }
  }
}