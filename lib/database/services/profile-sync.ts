"use client"

import type { User } from "@stackframe/stack";
import { StackIntegrationQueries } from '../queries/stack-integration';
// Custom types for profile sync - removed dependency on auth-integration
interface StackUserSync {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  profileImageUrl: string | null;
}

interface StackProfileData {
  user_id: string;
  full_name: string;
  role_type: string;
  department: string;
  company_id: string;
}

interface ProfileSyncResult {
  success: boolean;
  profile: Profile | null;
  created: boolean;
  error?: string;
}

interface ProfileSyncConfig {
  defaultRole: string;
  defaultDepartment: string;
  syncFields: string[];
  autoCreateProfile: boolean;
}

interface ProfileUpsertOptions {
  companyId: string;
  role: string;
  department: string;
  forceUpdate?: boolean;
}

interface StackUserValidation {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
}

type ProfileSyncStrategy = 'stack_authoritative' | 'database_authoritative' | 'merge';

interface ProfileFieldMapping {
  stackField: string;
  profileField: string;
  required?: boolean;
  transform?: (value: any, existingValue?: any) => any;
}

interface ProfileAuditEntry {
  userId: string;
  operation: string;
  changedFields: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  stackEventId: string;
  timestamp: Date;
}
import type { Profile } from '../queries/profiles';

/**
 * ProfileSyncService - Service layer for Stack-Database profile synchronization
 * 
 * Provides high-level operations for synchronizing Stack user data with database profiles.
 * Handles business logic, validation, error handling, and audit logging.
 */
export class ProfileSyncService {
  private static defaultConfig: ProfileSyncConfig = {
    defaultRole: 'empleado',
    defaultDepartment: 'General',
    syncFields: ['id', 'displayName', 'primaryEmail'],
    autoCreateProfile: true,
  };

  /**
   * Default field mappings between Stack user and Profile
   */
  private static defaultFieldMappings: ProfileFieldMapping[] = [
    {
      stackField: 'id',
      profileField: 'user_id',
      required: true,
    },
    {
      stackField: 'displayName',
      profileField: 'full_name',
      transform: (value: string | null) => value || 'Unknown User',
      required: true,
    },
    {
      stackField: 'primaryEmail',
      profileField: 'full_name',
      transform: (value: string | null, existingName?: string) => existingName || value || 'Unknown User',
    },
  ];

  /**
   * Validate Stack user data for profile operations
   * @param stackUser - Stack user to validate
   * @returns Validation result
   */
  static validateStackUser(stackUser: User): StackUserValidation {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!stackUser.id) {
      missingFields.push('id');
    }

    if (!stackUser.displayName && !stackUser.primaryEmail) {
      warnings.push('No display name or email available for user identification');
    }

    if (!stackUser.primaryEmail) {
      warnings.push('No primary email available');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings,
    };
  }

  /**
   * Convert Stack user to profile data
   * @param stackUser - Stack user object
   * @param companyId - Company ID to associate with profile
   * @param config - Sync configuration options
   * @returns Stack profile data ready for database operations
   */
  static stackUserToProfileData(
    stackUser: User,
    companyId: string,
    config: Partial<ProfileSyncConfig> = {}
  ): StackProfileData {
    const mergedConfig = { ...this.defaultConfig, ...config };

    return {
      user_id: stackUser.id,
      full_name: stackUser.displayName || stackUser.primaryEmail || 'Unknown User',
      role_type: mergedConfig.defaultRole,
      department: mergedConfig.defaultDepartment,
      company_id: companyId,
    };
  }

  /**
   * Sync Stack user with database profile (main service method)
   * @param stackUser - Authenticated Stack user
   * @param companyId - Company ID for profile association
   * @param config - Sync configuration
   * @returns Profile sync result
   */
  static async syncUserProfile(
    stackUser: User,
    companyId: string,
    config: Partial<ProfileSyncConfig> = {}
  ): Promise<ProfileSyncResult> {
    try {
      // Validate Stack user data
      const validation = this.validateStackUser(stackUser);
      if (!validation.isValid) {
        return {
          success: false,
          profile: null,
          created: false,
          error: `Invalid Stack user data: ${validation.missingFields.join(', ')}`,
        };
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Stack user validation warnings:', validation.warnings);
      }

      // Convert Stack user to profile data
      const profileData = this.stackUserToProfileData(stackUser, companyId, config);

      // Prepare upsert options
      const upsertOptions: ProfileUpsertOptions = {
        companyId,
        role: config.defaultRole || this.defaultConfig.defaultRole,
        department: config.defaultDepartment || this.defaultConfig.defaultDepartment,
        forceUpdate: false,
      };

      // Perform upsert operation
      const result = await StackIntegrationQueries.upsertProfile(
        stackUser.id,
        profileData,
        upsertOptions
      );

      // Log audit entry if successful
      if (result.success && result.profile) {
        await this.logProfileAudit({
          userId: stackUser.id,
          operation: result.created ? 'created' : 'synced',
          changedFields: result.created 
            ? Object.keys(profileData)
            : this.getChangedFields(result.profile, profileData),
          previousValues: {},
          newValues: result.profile,
          stackEventId: `stack_sync_${Date.now()}`,
          timestamp: new Date(),
        });
      }

      return result;

    } catch (error) {
      console.error('Error in syncUserProfile:', error);
      return {
        success: false,
        profile: null,
        created: false,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      };
    }
  }

  /**
   * Batch sync multiple Stack users with database profiles
   * @param stackUsers - Array of Stack users to sync
   * @param companyId - Company ID for profile association
   * @param config - Sync configuration
   * @returns Array of sync results
   */
  static async batchSyncUserProfiles(
    stackUsers: User[],
    companyId: string,
    config: Partial<ProfileSyncConfig> = {}
  ): Promise<ProfileSyncResult[]> {
    try {
      const profileUpdates = stackUsers.map(stackUser => {
        const profileData = this.stackUserToProfileData(stackUser, companyId, config);
        const upsertOptions: ProfileUpsertOptions = {
          companyId,
          role: config.defaultRole || this.defaultConfig.defaultRole,
          department: config.defaultDepartment || this.defaultConfig.defaultDepartment,
        };

        return {
          stackUserId: stackUser.id,
          profileData,
          options: upsertOptions,
        };
      });

      const results = await StackIntegrationQueries.batchUpsertProfiles(profileUpdates);

      // Log audit entries for successful operations
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const stackUser = stackUsers[i];

        if (result.success && result.profile) {
          await this.logProfileAudit({
            userId: stackUser.id,
            operation: result.created ? 'created' : 'synced',
            changedFields: result.created 
              ? Object.keys(profileUpdates[i].profileData)
              : this.getChangedFields(result.profile, profileUpdates[i].profileData),
            previousValues: {},
            newValues: result.profile,
            stackEventId: `stack_batch_sync_${Date.now()}`,
            timestamp: new Date(),
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Error in batchSyncUserProfiles:', error);
      return stackUsers.map(() => ({
        success: false,
        profile: null,
        created: false,
        error: error instanceof Error ? error.message : 'Batch sync failed',
      }));
    }
  }

  /**
   * Handle Stack user sign-in event
   * @param stackUser - Stack user who signed in
   * @param companyId - Company ID for profile association
   * @returns Profile sync result
   */
  static async handleStackSignIn(stackUser: User, companyId: string): Promise<ProfileSyncResult> {
    console.log(`Handling Stack sign-in for user: ${stackUser.id}`);
    
    return await this.syncUserProfile(stackUser, companyId, {
      autoCreateProfile: true,
    });
  }

  /**
   * Handle Stack user sign-out event
   * @param stackUserId - Stack user ID who signed out
   */
  static async handleStackSignOut(stackUserId: string): Promise<void> {
    try {
      console.log(`Handling Stack sign-out for user: ${stackUserId}`);
      
      // Log audit entry for sign-out
      await this.logProfileAudit({
        userId: stackUserId,
        operation: 'synced',
        changedFields: [],
        previousValues: {},
        newValues: {},
        stackEventId: `stack_signout_${Date.now()}`,
        timestamp: new Date(),
      });

      // Additional cleanup operations can be added here
      // For example: clearing cached session data, updating last activity, etc.

    } catch (error) {
      console.error('Error in handleStackSignOut:', error);
    }
  }

  /**
   * Sync existing profile with updated Stack user data
   * @param stackUser - Stack user with updated data
   * @param strategy - Sync strategy to use
   * @returns Updated profile or null if not found
   */
  static async syncExistingProfile(
    stackUser: User,
    strategy: ProfileSyncStrategy = 'stack_authoritative'
  ): Promise<Profile | null> {
    try {
      const stackUserData: StackUserSync = {
        id: stackUser.id,
        displayName: stackUser.displayName,
        primaryEmail: stackUser.primaryEmail,
        profileImageUrl: null, // Not currently used
      };

      const updatedProfile = await StackIntegrationQueries.syncProfileWithStackUser(
        stackUser.id,
        stackUserData
      );

      if (updatedProfile) {
        await this.logProfileAudit({
          userId: stackUser.id,
          operation: 'updated',
          changedFields: ['full_name'], // Simplified - in real implementation, compare actual changes
          previousValues: {},
          newValues: updatedProfile,
          stackEventId: `stack_update_${Date.now()}`,
          timestamp: new Date(),
        });
      }

      return updatedProfile;

    } catch (error) {
      console.error('Error in syncExistingProfile:', error);
      return null;
    }
  }

  /**
   * Get profile by Stack user ID with validation
   * @param stackUserId - Stack user ID to lookup
   * @returns Profile or null if not found
   */
  static async getProfileByStackUserId(stackUserId: string): Promise<Profile | null> {
    try {
      return await StackIntegrationQueries.getProfileByStackUserId(stackUserId);
    } catch (error) {
      console.error('Error getting profile by Stack user ID:', error);
      return null;
    }
  }

  /**
   * Check if Stack user has existing profile
   * @param stackUserId - Stack user ID to check
   * @returns Boolean indicating if profile exists
   */
  static async hasExistingProfile(stackUserId: string): Promise<boolean> {
    try {
      return await StackIntegrationQueries.hasExistingProfile(stackUserId);
    } catch (error) {
      console.error('Error checking existing profile:', error);
      return false;
    }
  }

  /**
   * Clean up profile data for Stack user (for GDPR compliance)
   * @param stackUserId - Stack user ID to clean up
   * @returns Boolean indicating if cleanup was successful
   */
  static async cleanupUserData(stackUserId: string): Promise<boolean> {
    try {
      const deleted = await StackIntegrationQueries.deleteProfileByStackUserId(stackUserId);
      
      if (deleted) {
        await this.logProfileAudit({
          userId: stackUserId,
          operation: 'synced', // Using 'synced' as we don't have 'deleted' operation
          changedFields: ['deleted'],
          previousValues: {},
          newValues: {},
          stackEventId: `stack_cleanup_${Date.now()}`,
          timestamp: new Date(),
        });
      }

      return deleted;

    } catch (error) {
      console.error('Error in cleanupUserData:', error);
      return false;
    }
  }

  /**
   * Get Stack integration health status
   * @param companyId - Optional company ID filter
   * @returns Integration health information
   */
  static async getIntegrationHealth(companyId?: string) {
    try {
      const stats = await StackIntegrationQueries.getStackProfileStats(companyId);
      
      return {
        stackConnected: true, // In real implementation, check Stack API health
        databaseConnected: true, // In real implementation, check database connectivity
        lastSyncTimestamp: new Date(),
        pendingSyncs: 0, // In real implementation, check for pending sync operations
        errors: [], // In real implementation, return recent errors
        profileStats: stats,
      };
    } catch (error) {
      console.error('Error getting integration health:', error);
      return {
        stackConnected: false,
        databaseConnected: false,
        lastSyncTimestamp: undefined,
        pendingSyncs: 0,
        errors: [{
          code: 'DATABASE_ERROR' as const,
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        }],
        profileStats: { total: 0, createdToday: 0, createdThisWeek: 0, createdThisMonth: 0 },
      };
    }
  }

  /**
   * Helper method to determine changed fields between profiles
   */
  private static getChangedFields(currentProfile: Profile, newProfileData: StackProfileData): string[] {
    const changedFields: string[] = [];

    if (currentProfile.full_name !== newProfileData.full_name) {
      changedFields.push('full_name');
    }
    
    if (currentProfile.role_type !== newProfileData.role_type) {
      changedFields.push('role_type');
    }
    
    if (currentProfile.department !== newProfileData.department) {
      changedFields.push('department');
    }
    
    if (currentProfile.company_id !== newProfileData.company_id) {
      changedFields.push('company_id');
    }

    return changedFields;
  }

  /**
   * Log profile audit entry (simplified implementation)
   * In production, this would write to a dedicated audit table
   */
  private static async logProfileAudit(entry: ProfileAuditEntry): Promise<void> {
    try {
      // For now, just log to console
      // In production, this would write to an audit log table
      console.log('Profile audit log:', {
        userId: entry.userId,
        operation: entry.operation,
        changedFields: entry.changedFields,
        timestamp: entry.timestamp.toISOString(),
        stackEventId: entry.stackEventId,
      });
    } catch (error) {
      console.error('Error logging profile audit:', error);
      // Don't throw here as audit logging shouldn't break the main operation
    }
  }
}