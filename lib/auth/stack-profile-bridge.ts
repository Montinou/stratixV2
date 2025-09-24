"use client"

import type { User } from "@stackframe/stack"
import { ProfilesRepository, type Profile } from "@/lib/database/queries/profiles"

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
   * @param stackUser - Authenticated Stack user
   * @param defaultCompanyId - Company ID to use for new profiles
   * @returns User profile from database or newly created profile
   */
  static async getOrCreateProfile(stackUser: User, defaultCompanyId: string): Promise<Profile | null> {
    try {
      // First try to get existing profile
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

      // Profile doesn't exist, create new one
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
   * Handle user profile cleanup on logout
   * @param userId - User ID to cleanup
   */
  static async handleLogout(userId: string): Promise<void> {
    try {
      // For now, we don't delete profiles on logout
      // This could be extended to handle session cleanup in the future
      console.log(`User ${userId} logged out - session cleaned up`)
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