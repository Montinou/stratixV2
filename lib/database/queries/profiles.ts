import { eq, and, desc } from 'drizzle-orm';
import { getDrizzleDb } from '../client';
import { profiles, companies } from '../schema';
import type { 
  Profile, 
  InsertProfile, 
  UpdateProfile,
  ProfileWithCompany,
  User,
  Company,
  UserRole 
} from '../types';

class ProfilesRepository {
  private db = getDrizzleDb();

  /**
   * Get profile by user ID with company information
   * Uses standard Neon Auth approach - user info comes from neon_auth.users_sync
   */
  async getByUserId(userId: string): Promise<ProfileWithCompany | null> {
    try {
      const results = await this.db
        .select({
          userId: profiles.userId,
          fullName: profiles.fullName,
          roleType: profiles.roleType,
          department: profiles.department,
          companyId: profiles.companyId,
          createdAt: profiles.createdAt,
          updatedAt: profiles.updatedAt,
          // Company information
          company_id: companies.id,
          company_name: companies.name,
          company_description: companies.description,
          company_industry: companies.industry,
          company_size: companies.size,
          company_created_at: companies.createdAt,
          company_updated_at: companies.updatedAt,
        })
        .from(profiles)
        .leftJoin(companies, eq(profiles.companyId, companies.id))
        .where(eq(profiles.userId, userId))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];

      return {
        userId: row.userId,
        fullName: row.fullName,
        roleType: row.roleType,
        department: row.department,
        companyId: row.companyId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // User info comes from neon_auth.users_sync, not needed here
        user: undefined,
        // Include company info
        company: row.company_id ? {
          id: row.company_id,
          name: row.company_name!,
          description: row.company_description,
          industry: row.company_industry,
          size: row.company_size,
          createdAt: row.company_created_at!,
          updatedAt: row.company_updated_at!,
        } : undefined
      };
    } catch (error) {
      console.error('Error fetching profile by user ID:', error);
      throw error;
    }
  }

  /**
   * Get all profiles with optional company and role filtering
   * Used for team management and user listing
   */
  async getAll(filters?: {
    companyId?: string;
    roleType?: UserRole;
    department?: string;
  }): Promise<ProfileWithCompany[]> {
    try {
      let query = this.db
        .select({
          userId: profiles.userId,
          fullName: profiles.fullName,
          roleType: profiles.roleType,
          department: profiles.department,
          companyId: profiles.companyId,
          createdAt: profiles.createdAt,
          updatedAt: profiles.updatedAt,
          // Company information
          company_id: companies.id,
          company_name: companies.name,
          company_description: companies.description,
          company_industry: companies.industry,
          company_size: companies.size,
          company_created_at: companies.createdAt,
          company_updated_at: companies.updatedAt,
        })
        .from(profiles)
        .leftJoin(companies, eq(profiles.companyId, companies.id))
        .orderBy(desc(profiles.createdAt));

      // Apply filters
      const conditions = [];
      if (filters?.companyId) {
        conditions.push(eq(profiles.companyId, filters.companyId));
      }
      if (filters?.roleType) {
        conditions.push(eq(profiles.roleType, filters.roleType));
      }
      if (filters?.department) {
        conditions.push(eq(profiles.department, filters.department));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const results = await query;

      return results.map(row => ({
        userId: row.userId,
        fullName: row.fullName,
        roleType: row.roleType,
        department: row.department,
        companyId: row.companyId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // User info comes from neon_auth.users_sync, not needed here
        user: undefined,
        // Include company info
        company: row.company_id ? {
          id: row.company_id,
          name: row.company_name!,
          description: row.company_description,
          industry: row.company_industry,
          size: row.company_size,
          createdAt: row.company_created_at!,
          updatedAt: row.company_updated_at!,
        } : undefined
      }));
    } catch (error) {
      console.error('Error fetching all profiles:', error);
      throw error;
    }
  }

  /**
   * Create a new user profile
   * Used during user registration and Stack Auth integration
   */
  async create(profileData: Omit<InsertProfile, 'createdAt' | 'updatedAt'>): Promise<Profile> {
    try {
      const results = await this.db
        .insert(profiles)
        .values({
          userId: profileData.userId,
          fullName: profileData.fullName,
          roleType: profileData.roleType,
          department: profileData.department,
          companyId: profileData.companyId,
        })
        .returning();

      const created = results[0];

      return {
        userId: created.userId,
        fullName: created.fullName,
        roleType: created.roleType,
        department: created.department,
        companyId: created.companyId,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Update an existing profile
   * Maintains exact API compatibility for profile updates
   */
  async update(userId: string, updates: UpdateProfile): Promise<Profile> {
    try {
      // Build update object
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Only include fields that are actually being updated
      if (updates.fullName !== undefined) updateData.fullName = updates.fullName;
      if (updates.roleType !== undefined) updateData.roleType = updates.roleType;
      if (updates.department !== undefined) updateData.department = updates.department;
      if (updates.companyId !== undefined) updateData.companyId = updates.companyId;

      const results = await this.db
        .update(profiles)
        .set(updateData)
        .where(eq(profiles.userId, userId))
        .returning();

      if (results.length === 0) {
        throw new Error(`Profile for user ID ${userId} not found`);
      }

      const updated = results[0];

      return {
        userId: updated.userId,
        fullName: updated.fullName,
        roleType: updated.roleType,
        department: updated.department,
        companyId: updated.companyId,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };


    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Delete a profile
   * Used for user account cleanup
   */
  async delete(userId: string): Promise<void> {
    try {
      await this.db
        .delete(profiles)
        .where(eq(profiles.userId, userId));

    } catch (error) {
      console.error('Error deleting profile:', error);

      throw error;
    }
  }

  /**
   * Get profiles by department for team management
   * Used for departmental filtering and team views
   */
  async getByDepartment(department: string, companyId?: string): Promise<ProfileWithCompany[]> {
    try {
      let query = this.db
        .select({
          userId: profiles.userId,
          fullName: profiles.fullName,
          roleType: profiles.roleType,
          department: profiles.department,
          companyId: profiles.companyId,
          createdAt: profiles.createdAt,
          updatedAt: profiles.updatedAt,
          // Company information
          company_id: companies.id,
          company_name: companies.name,
          company_description: companies.description,
          company_industry: companies.industry,
          company_size: companies.size,
          company_created_at: companies.createdAt,
          company_updated_at: companies.updatedAt,
        })
        .from(profiles)
        .leftJoin(companies, eq(profiles.companyId, companies.id))
        .where(eq(profiles.department, department))
        .orderBy(desc(profiles.createdAt));

      // Add company filter if provided
      if (companyId) {
        query = query.where(and(
          eq(profiles.department, department),
          eq(profiles.companyId, companyId)
        ));
      }

      const results = await query;

      return results.map(row => ({
        userId: row.userId,
        fullName: row.fullName,
        roleType: row.roleType,
        department: row.department,
        companyId: row.companyId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        // User info comes from neon_auth.users_sync, not needed here
        user: undefined,
        // Include company info
        company: row.company_id ? {
          id: row.company_id,
          name: row.company_name!,
          description: row.company_description,
          industry: row.company_industry,
          size: row.company_size,
          createdAt: row.company_created_at!,
          updatedAt: row.company_updated_at!,
        } : undefined
      }));

    } catch (error) {
      console.error('Error fetching profiles by department:', error);
      throw error;
    }
  }

  /**
   * Create profile for Stack Auth user if it doesn't exist
   * Used during Stack Auth integration to ensure profiles exist
   * Fixed: Uses UPSERT to avoid race conditions
   */
  async createOrUpdate(userId: string, profileData: {
    fullName: string;
    roleType: UserRole;
    department: string;
    companyId: string;
  }): Promise<Profile> {
    try {
      // Use ON CONFLICT to handle race conditions atomically
      const results = await this.db
        .insert(profiles)
        .values({
          userId,
          fullName: profileData.fullName,
          roleType: profileData.roleType,
          department: profileData.department,
          companyId: profileData.companyId,
        })
        .onConflictDoUpdate({
          target: profiles.userId,
          set: {
            fullName: profileData.fullName,
            roleType: profileData.roleType,
            department: profileData.department,
            companyId: profileData.companyId,
            updatedAt: new Date(),
          }
        })
        .returning();

      const result = results[0];

      return {
        userId: result.userId,
        fullName: result.fullName,
        roleType: result.roleType,
        department: result.department,
        companyId: result.companyId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

    } catch (error) {
      console.error('Error creating or updating profile:', error);

      throw error;
    }
  }
}

// Create singleton instance
const profilesRepository = new ProfilesRepository();

// Export adapter functions for backward compatibility
export async function getProfileById(userId: string): Promise<Profile | null> {
  const profileWithCompany = await profilesRepository.getByUserId(userId);
  if (!profileWithCompany) {
    return null;
  }

  // Convert ProfileWithCompany to Profile and add backward compatibility fields
  const profile: Profile & { role?: string; name?: string; company_name?: string; industry?: string } = {
    userId: profileWithCompany.userId,
    fullName: profileWithCompany.fullName,
    roleType: profileWithCompany.roleType,
    department: profileWithCompany.department,
    companyId: profileWithCompany.companyId,
    createdAt: profileWithCompany.createdAt,
    updatedAt: profileWithCompany.updatedAt,
    // Add backward compatibility fields expected by chat context
    role: profileWithCompany.roleType,
    name: profileWithCompany.fullName,
    company_name: profileWithCompany.company?.name,
    industry: profileWithCompany.company?.industry,
  };

  return profile;
}

// Export the repository instance for direct use
export { profilesRepository };
export default profilesRepository;