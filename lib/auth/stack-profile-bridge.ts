"use client"

import type { User } from "@stackframe/stack"
import { ProfilesRepository, type Profile } from "@/lib/database/queries/profiles"
import { ProfileSyncService } from "@/lib/database/services/profile-sync"
import type { ProfileSyncResult } from "@/lib/types/auth-integration"

/**
 * Bridge between Stack authentication and database profile management
 * Handles automatic profile creation, sync, and fallback scenarios
 */
export class StackProfileBridge {
  /**
   * Convert Stack user data to profile format for database storage
   * @param stackUser - Stack user object
   * @param companyId - Company ID to associate with the profile
   * @returns Profile data ready for database insertion
   */
  private static stackUserToProfile(stackUser: User, companyId: string): Omit<Profile, 'created_at' | 'updated_at'> {
    return {
      user_id: stackUser.id,
      full_name: stackUser.displayName || stackUser.primaryEmail || 'Unknown User',
      role_type: 'empleado', // Default role, can be updated later by admin
      department: 'General', // Default department, can be updated later
      company_id: companyId,
    }
  }

  /**
   * Get or create user profile based on Stack authentication
   * Enhanced with ProfileSyncService for better transaction handling and audit logging
   * @param stackUser - Authenticated Stack user
   * @param defaultCompanyId - Company ID to use for new profiles
   * @returns User profile from database or newly created profile
   */
  static async getOrCreateProfile(stackUser: User, defaultCompanyId: string): Promise<Profile | null> {
    try {
      // Use ProfileSyncService for enhanced sync capabilities
      const syncResult: ProfileSyncResult = await ProfileSyncService.syncUserProfile(
        stackUser, 
        defaultCompanyId
      )
      
      if (syncResult.success && syncResult.profile) {
        return syncResult.profile
      }
      
      // Fallback to direct repository access if sync service fails
      console.warn('ProfileSyncService failed, falling back to direct repository access:', syncResult.error)
      
      const existingProfile = await ProfilesRepository.getByUserId(stackUser.id)
      
      if (existingProfile) {
        // Profile exists, sync any updated data from Stack
        const shouldUpdate = this.shouldSyncProfile(existingProfile, stackUser)
        
        if (shouldUpdate) {
          const updates = this.getProfileUpdates(existingProfile, stackUser)
          return await ProfilesRepository.update(stackUser.id, updates)
        }
        
        return existingProfile
      }

      // Profile doesn't exist, create new one using fallback method
      const newProfileData = this.stackUserToProfile(stackUser, defaultCompanyId)
      return await ProfilesRepository.create(newProfileData)
      
    } catch (error) {
      console.error('Error in getOrCreateProfile:', error)
      return null
    }
  }

  /**
   * Check if profile needs to be updated based on Stack user data
   * @param profile - Existing database profile
   * @param stackUser - Current Stack user data
   * @returns Boolean indicating if sync is needed
   */
  private static shouldSyncProfile(profile: Profile, stackUser: User): boolean {
    const stackName = stackUser.displayName || stackUser.primaryEmail || 'Unknown User'
    
    // Check if name needs updating
    if (profile.full_name !== stackName) {
      return true
    }

    // Add more sync conditions as needed
    return false
  }

  /**
   * Get profile updates needed to sync with Stack user data
   * @param profile - Existing database profile  
   * @param stackUser - Current Stack user data
   * @returns Partial profile updates
   */
  private static getProfileUpdates(profile: Profile, stackUser: User): Partial<Profile> {
    const updates: Partial<Profile> = {}
    const stackName = stackUser.displayName || stackUser.primaryEmail || 'Unknown User'

    if (profile.full_name !== stackName) {
      updates.full_name = stackName
    }

    return updates
  }

  /**
   * Create fallback profile data from Stack user when database is unavailable
   * @param stackUser - Stack user object
   * @returns Fallback profile object (not saved to database)
   */
  static createFallbackProfile(stackUser: User): Profile {
    return {
      user_id: stackUser.id,
      full_name: stackUser.displayName || stackUser.primaryEmail || 'Unknown User',
      role_type: 'empleado',
      department: 'General',
      company_id: 'fallback-company',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  /**
   * Handle Stack user sign-in event with enhanced ProfileSyncService
   * @param stackUser - Stack user who signed in
   * @param defaultCompanyId - Company ID for profile association
   * @returns Profile sync result
   */
  static async handleStackSignIn(stackUser: User, defaultCompanyId: string): Promise<ProfileSyncResult> {
    try {
      return await ProfileSyncService.handleStackSignIn(stackUser, defaultCompanyId)
    } catch (error) {
      console.error('Error in handleStackSignIn:', error)
      return {
        success: false,
        profile: null,
        created: false,
        error: error instanceof Error ? error.message : 'Sign-in handling failed',
      }
    }
  }

  /**
   * Handle user profile cleanup on logout with enhanced ProfileSyncService
   * @param userId - User ID to cleanup
   */
  static async handleLogout(userId: string): Promise<void> {
    try {
      // Use ProfileSyncService for enhanced logout handling
      await ProfileSyncService.handleStackSignOut(userId)
    } catch (error) {
      console.error('Error in logout cleanup:', error)
    }
  }

  /**
   * Validate that a profile has required fields for the application
   * @param profile - Profile to validate
   * @returns Boolean indicating if profile is valid
   */
  static isValidProfile(profile: Profile | null): boolean {
    if (!profile) {
      return false
    }

    return Boolean(
      profile.user_id &&
      profile.full_name &&
      profile.role_type &&
      profile.company_id
    )
  }
}