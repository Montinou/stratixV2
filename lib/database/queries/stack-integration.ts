import { eq, and, sql } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { profiles, type Profile as DrizzleProfile, type InsertProfile } from '../schema';
import type { Profile } from './profiles';
import type { 
  StackUserSync, 
  StackProfileData, 
  ProfileSyncResult, 
  ProfileUpsertOptions,
  ProfileTransactionContext
} from '@/lib/types/auth-integration';

/**
 * StackIntegrationQueries - Specialized Drizzle queries for Stack authentication integration
 * 
 * Provides type-safe database operations for Stack user profile integration,
 * including upsert operations, profile synchronization, and transaction handling.
 */
export class StackIntegrationQueries {
  private static db = getDrizzleClient();

  /**
   * Convert Drizzle profile to domain model format
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
   * Convert Stack profile data to Drizzle insert format
   */
  private static toDbModel(profileData: StackProfileData): InsertProfile {
    return {
      userId: profileData.user_id,
      fullName: profileData.full_name,
      roleType: profileData.role_type,
      department: profileData.department,
      companyId: profileData.company_id,
    };
  }

  /**
   * Upsert profile for Stack user with transaction support
   * @param stackUserId - Stack user ID
   * @param profileData - Profile data to upsert
   * @param options - Upsert options
   * @returns ProfileSyncResult with operation details
   */
  static async upsertProfile(
    stackUserId: string,
    profileData: StackProfileData,
    options: ProfileUpsertOptions
  ): Promise<ProfileSyncResult> {
    try {
      // Start transaction
      const result = await this.db.transaction(async (tx) => {
        // Check if profile exists
        const existing = await tx
          .select()
          .from(profiles)
          .where(eq(profiles.userId, stackUserId))
          .limit(1);

        const dbModel = this.toDbModel(profileData);

        if (existing.length > 0) {
          // Profile exists - update it
          const updated = await tx
            .update(profiles)
            .set({
              ...dbModel,
              updatedAt: new Date(),
            })
            .where(eq(profiles.userId, stackUserId))
            .returning();

          if (updated.length === 0) {
            throw new Error('Failed to update profile');
          }

          return {
            profile: this.toDomainModel(updated[0]),
            created: false,
          };
        } else {
          // Profile doesn't exist - create it
          const created = await tx
            .insert(profiles)
            .values(dbModel)
            .returning();

          if (created.length === 0) {
            throw new Error('Failed to create profile');
          }

          return {
            profile: this.toDomainModel(created[0]),
            created: true,
          };
        }
      });

      return {
        success: true,
        profile: result.profile,
        created: result.created,
      };

    } catch (error) {
      console.error('Error in upsertProfile:', error);
      return {
        success: false,
        profile: null,
        created: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Batch upsert multiple profiles with transaction support
   * @param profileUpdates - Array of profile data to upsert
   * @returns Array of ProfileSyncResult
   */
  static async batchUpsertProfiles(
    profileUpdates: { stackUserId: string; profileData: StackProfileData; options: ProfileUpsertOptions }[]
  ): Promise<ProfileSyncResult[]> {
    try {
      const results = await this.db.transaction(async (tx) => {
        const batchResults: ProfileSyncResult[] = [];

        for (const update of profileUpdates) {
          try {
            // Check if profile exists
            const existing = await tx
              .select()
              .from(profiles)
              .where(eq(profiles.userId, update.stackUserId))
              .limit(1);

            const dbModel = this.toDbModel(update.profileData);

            if (existing.length > 0) {
              // Update existing profile
              const updated = await tx
                .update(profiles)
                .set({
                  ...dbModel,
                  updatedAt: new Date(),
                })
                .where(eq(profiles.userId, update.stackUserId))
                .returning();

              batchResults.push({
                success: true,
                profile: updated.length > 0 ? this.toDomainModel(updated[0]) : null,
                created: false,
              });
            } else {
              // Create new profile
              const created = await tx
                .insert(profiles)
                .values(dbModel)
                .returning();

              batchResults.push({
                success: true,
                profile: created.length > 0 ? this.toDomainModel(created[0]) : null,
                created: true,
              });
            }
          } catch (error) {
            batchResults.push({
              success: false,
              profile: null,
              created: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return batchResults;
      });

      return results;

    } catch (error) {
      console.error('Error in batchUpsertProfiles:', error);
      return profileUpdates.map(() => ({
        success: false,
        profile: null,
        created: false,
        error: error instanceof Error ? error.message : 'Batch operation failed',
      }));
    }
  }

  /**
   * Get profile with Stack user ID validation
   * @param stackUserId - Stack user ID to lookup
   * @returns Profile or null if not found
   */
  static async getProfileByStackUserId(stackUserId: string): Promise<Profile | null> {
    try {
      const result = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, stackUserId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error fetching profile by Stack user ID:', error);
      throw error;
    }
  }

  /**
   * Check if Stack user has existing profile
   * @param stackUserId - Stack user ID to check
   * @returns Boolean indicating if profile exists
   */
  static async hasExistingProfile(stackUserId: string): Promise<boolean> {
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(profiles)
        .where(eq(profiles.userId, stackUserId));

      return (result[0]?.count || 0) > 0;
    } catch (error) {
      console.error('Error checking profile existence:', error);
      throw error;
    }
  }

  /**
   * Get profiles that need Stack user data sync
   * @param lastSyncTimestamp - Only return profiles updated before this timestamp
   * @param limit - Maximum number of profiles to return
   * @returns Array of profiles needing sync
   */
  static async getProfilesForSync(lastSyncTimestamp: Date, limit: number = 100): Promise<Profile[]> {
    try {
      const result = await this.db
        .select()
        .from(profiles)
        .where(sql`${profiles.updatedAt} < ${lastSyncTimestamp}`)
        .orderBy(profiles.updatedAt)
        .limit(limit);

      return result.map(profile => this.toDomainModel(profile));
    } catch (error) {
      console.error('Error fetching profiles for sync:', error);
      throw error;
    }
  }

  /**
   * Update profile with Stack user sync data
   * @param stackUserId - Stack user ID
   * @param stackUserData - Stack user data to sync
   * @returns Updated profile or null if not found
   */
  static async syncProfileWithStackUser(
    stackUserId: string,
    stackUserData: StackUserSync
  ): Promise<Profile | null> {
    try {
      // Prepare updates based on Stack user data
      const updates: Partial<InsertProfile> = {};
      
      if (stackUserData.displayName || stackUserData.primaryEmail) {
        updates.fullName = stackUserData.displayName || stackUserData.primaryEmail || 'Unknown User';
      }

      // Only update if there are actual changes
      if (Object.keys(updates).length === 0) {
        return await this.getProfileByStackUserId(stackUserId);
      }

      updates.updatedAt = new Date();

      const result = await this.db
        .update(profiles)
        .set(updates)
        .where(eq(profiles.userId, stackUserId))
        .returning();

      if (result.length === 0) {
        return null;
      }

      return this.toDomainModel(result[0]);
    } catch (error) {
      console.error('Error syncing profile with Stack user:', error);
      throw error;
    }
  }

  /**
   * Delete profile by Stack user ID (for cleanup operations)
   * @param stackUserId - Stack user ID
   * @returns Boolean indicating if profile was deleted
   */
  static async deleteProfileByStackUserId(stackUserId: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(profiles)
        .where(eq(profiles.userId, stackUserId))
        .returning({ userId: profiles.userId });

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting profile by Stack user ID:', error);
      throw error;
    }
  }

  /**
   * Get profile creation statistics for Stack users
   * @param companyId - Optional company ID filter
   * @returns Statistics about Stack user profile creation
   */
  static async getStackProfileStats(companyId?: string) {
    try {
      let query = this.db
        .select({
          total: sql<number>`count(*)`,
          createdToday: sql<number>`count(*) filter (where ${profiles.createdAt} >= current_date)`,
          createdThisWeek: sql<number>`count(*) filter (where ${profiles.createdAt} >= current_date - interval '7 days')`,
          createdThisMonth: sql<number>`count(*) filter (where ${profiles.createdAt} >= current_date - interval '30 days')`,
        })
        .from(profiles);

      if (companyId) {
        query = query.where(eq(profiles.companyId, companyId));
      }

      const result = await query;
      return result[0] || { total: 0, createdToday: 0, createdThisWeek: 0, createdThisMonth: 0 };
    } catch (error) {
      console.error('Error fetching Stack profile stats:', error);
      throw error;
    }
  }
}