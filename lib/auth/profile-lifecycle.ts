import type { User } from "@stackframe/stack"
import type { 
  DatabaseProfile, 
  Company, 
  ProfileLifecycleManager,
  ProfileSyncResult,
  ProfileSyncStatus,
  AuthIntegrationConfig,
  DEFAULT_AUTH_CONFIG
} from "@/lib/types/auth-integration"
import { AuthIntegrationError, extractUserMetadata, toAuthProfile } from "@/lib/types/auth-integration"
import { ProfilesService, CompaniesService } from "@/lib/database/services"
import type { Profile } from "@/lib/database/services"

/**
 * Profile Lifecycle Manager
 * 
 * Handles complete lifecycle of user profiles:
 * - Automatic profile creation when Stack users sign in
 * - Profile synchronization with Stack user data
 * - Profile updates and maintenance
 * - Cleanup on user deletion
 */

export class ProfileLifecycleService implements ProfileLifecycleManager {
  private config: AuthIntegrationConfig

  constructor(config: AuthIntegrationConfig = DEFAULT_AUTH_CONFIG) {
    this.config = config
  }

  /**
   * Create a new profile for a Stack user
   */
  public async createProfile(user: User, companyId?: string): Promise<ProfileSyncResult> {
    try {
      const { email, displayName, userId } = extractUserMetadata(user)

      // Check if profile already exists
      const existingProfile = await ProfilesService.getByUserId(userId)
      if (existingProfile) {
        console.log(`Profile already exists for user ${userId}`)
        return await this.syncProfile(user)
      }

      // Determine company ID
      const finalCompanyId = companyId || this.config.defaultCompanyId
      if (!finalCompanyId) {
        throw new AuthIntegrationError(
          'Cannot create profile: no company ID provided and no default company configured',
          'SYNC_ERROR'
        )
      }

      // Verify company exists
      const company = await CompaniesService.getById(finalCompanyId)
      if (!company) {
        throw new AuthIntegrationError(
          `Cannot create profile: company ${finalCompanyId} not found`,
          'DATABASE_ERROR'
        )
      }

      // Create the profile with default values
      const newProfile: Omit<Profile, 'created_at' | 'updated_at'> = {
        user_id: userId,
        full_name: displayName,
        role_type: "empleado", // Default role
        department: "General", // Default department
        company_id: finalCompanyId,
      }

      console.log(`Creating new profile for user ${userId}:`, newProfile)
      
      const createdProfile = await ProfilesService.create(newProfile)

      // Convert to database profile format
      const dbProfile: DatabaseProfile = {
        userId: createdProfile.user_id,
        fullName: createdProfile.full_name,
        roleType: createdProfile.role_type,
        department: createdProfile.department,
        companyId: createdProfile.company_id,
        createdAt: createdProfile.created_at,
        updatedAt: createdProfile.updated_at,
      }

      console.log(`Successfully created profile for user ${userId}`)

      return {
        status: "synced" as ProfileSyncStatus,
        profile: dbProfile,
        company: {
          id: company.id,
          name: company.name,
          description: company.description || null,
          industry: company.industry || null,
          size: company.size || null,
          createdAt: company.created_at,
          updatedAt: company.updated_at,
        },
      }

    } catch (error) {
      console.error('Error creating profile:', error)
      
      if (error instanceof AuthIntegrationError) {
        throw error
      }

      return {
        status: "error" as ProfileSyncStatus,
        profile: null,
        company: null,
        error: error instanceof Error ? error.message : 'Unknown error creating profile',
      }
    }
  }

  /**
   * Update an existing profile
   */
  public async updateProfile(userId: string, updates: Partial<DatabaseProfile>): Promise<ProfileSyncResult> {
    try {
      // Convert database profile format to service format
      const serviceUpdates: Partial<Profile> = {}
      
      if (updates.fullName !== undefined) {
        serviceUpdates.full_name = updates.fullName
      }
      if (updates.roleType !== undefined) {
        serviceUpdates.role_type = updates.roleType
      }
      if (updates.department !== undefined) {
        serviceUpdates.department = updates.department
      }
      if (updates.companyId !== undefined) {
        serviceUpdates.company_id = updates.companyId
      }

      console.log(`Updating profile for user ${userId}:`, serviceUpdates)

      const updatedProfile = await ProfilesService.update(userId, serviceUpdates)

      // Get company information
      let company: Company | null = null
      try {
        const companyData = await CompaniesService.getById(updatedProfile.company_id)
        if (companyData) {
          company = {
            id: companyData.id,
            name: companyData.name,
            description: companyData.description || null,
            industry: companyData.industry || null,
            size: companyData.size || null,
            createdAt: companyData.created_at,
            updatedAt: companyData.updated_at,
          }
        }
      } catch (companyError) {
        console.warn('Failed to fetch company data during profile update:', companyError)
      }

      const dbProfile: DatabaseProfile = {
        userId: updatedProfile.user_id,
        fullName: updatedProfile.full_name,
        roleType: updatedProfile.role_type,
        department: updatedProfile.department,
        companyId: updatedProfile.company_id,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at,
      }

      console.log(`Successfully updated profile for user ${userId}`)

      return {
        status: "synced" as ProfileSyncStatus,
        profile: dbProfile,
        company,
      }

    } catch (error) {
      console.error('Error updating profile:', error)
      
      return {
        status: "error" as ProfileSyncStatus,
        profile: null,
        company: null,
        error: error instanceof Error ? error.message : 'Unknown error updating profile',
      }
    }
  }

  /**
   * Sync profile with current Stack user data
   */
  public async syncProfile(user: User): Promise<ProfileSyncResult> {
    try {
      const { email, displayName, userId } = extractUserMetadata(user)

      // Get existing profile
      const existingProfile = await ProfilesService.getByUserId(userId)
      if (!existingProfile) {
        // Profile doesn't exist, create it if auto-creation is enabled
        if (this.config.enableAutoProfileCreation) {
          console.log(`Profile not found for user ${userId}, creating new profile`)
          return await this.createProfile(user)
        } else {
          throw new AuthIntegrationError(
            `Profile not found for user ${userId} and auto-creation is disabled`,
            'SYNC_ERROR'
          )
        }
      }

      // Check if sync is needed by comparing current Stack data with profile data
      let needsUpdate = false
      const updates: Partial<DatabaseProfile> = {}

      // Compare display name
      if (existingProfile.full_name !== displayName) {
        updates.fullName = displayName
        needsUpdate = true
      }

      if (needsUpdate && this.config.enableProfileSync) {
        console.log(`Profile sync needed for user ${userId}`)
        return await this.updateProfile(userId, updates)
      }

      // No sync needed, return current profile data
      console.log(`Profile already in sync for user ${userId}`)

      // Get company information
      let company: Company | null = null
      try {
        const companyData = await CompaniesService.getById(existingProfile.company_id)
        if (companyData) {
          company = {
            id: companyData.id,
            name: companyData.name,
            description: companyData.description || null,
            industry: companyData.industry || null,
            size: companyData.size || null,
            createdAt: companyData.created_at,
            updatedAt: companyData.updated_at,
          }
        }
      } catch (companyError) {
        console.warn('Failed to fetch company data during profile sync:', companyError)
      }

      const dbProfile: DatabaseProfile = {
        userId: existingProfile.user_id,
        fullName: existingProfile.full_name,
        roleType: existingProfile.role_type,
        department: existingProfile.department,
        companyId: existingProfile.company_id,
        createdAt: existingProfile.created_at,
        updatedAt: existingProfile.updated_at,
      }

      return {
        status: "synced" as ProfileSyncStatus,
        profile: dbProfile,
        company,
      }

    } catch (error) {
      console.error('Error syncing profile:', error)

      if (error instanceof AuthIntegrationError) {
        throw error
      }

      return {
        status: "error" as ProfileSyncStatus,
        profile: null,
        company: null,
        error: error instanceof Error ? error.message : 'Unknown error syncing profile',
      }
    }
  }

  /**
   * Delete a user profile (cleanup on account deletion)
   */
  public async deleteProfile(userId: string): Promise<void> {
    try {
      console.log(`Deleting profile for user ${userId}`)
      
      // Check if profile exists before attempting deletion
      const existingProfile = await ProfilesService.getByUserId(userId)
      if (!existingProfile) {
        console.warn(`Profile for user ${userId} not found, nothing to delete`)
        return
      }

      // Use ProfilesRepository for proper deletion
      const { ProfilesRepository } = await import('@/lib/database/queries/profiles')
      const profilesRepo = new ProfilesRepository()
      await profilesRepo.delete(userId)
      
      console.log(`Successfully deleted profile for user ${userId}`)
      
    } catch (error) {
      console.error('Error deleting profile:', error)
      throw new AuthIntegrationError(
        'Failed to delete profile',
        'DATABASE_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get profile and company data for a user
   */
  public async getProfileData(userId: string): Promise<ProfileSyncResult> {
    try {
      const profile = await ProfilesService.getByUserId(userId)
      if (!profile) {
        return {
          status: "error" as ProfileSyncStatus,
          profile: null,
          company: null,
          error: 'Profile not found',
        }
      }

      // Get company information
      let company: Company | null = null
      try {
        const companyData = await CompaniesService.getById(profile.company_id)
        if (companyData) {
          company = {
            id: companyData.id,
            name: companyData.name,
            description: companyData.description || null,
            industry: companyData.industry || null,
            size: companyData.size || null,
            createdAt: companyData.created_at,
            updatedAt: companyData.updated_at,
          }
        }
      } catch (companyError) {
        console.warn('Failed to fetch company data:', companyError)
      }

      const dbProfile: DatabaseProfile = {
        userId: profile.user_id,
        fullName: profile.full_name,
        roleType: profile.role_type,
        department: profile.department,
        companyId: profile.company_id,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      }

      return {
        status: "synced" as ProfileSyncStatus,
        profile: dbProfile,
        company,
      }

    } catch (error) {
      console.error('Error getting profile data:', error)
      
      return {
        status: "error" as ProfileSyncStatus,
        profile: null,
        company: null,
        error: error instanceof Error ? error.message : 'Unknown error getting profile data',
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AuthIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  public getConfig(): AuthIntegrationConfig {
    return { ...this.config }
  }
}

// Singleton instance for global use
let globalProfileManager: ProfileLifecycleService | null = null

/**
 * Get or create the global profile lifecycle manager instance
 */
export function getProfileLifecycleManager(config?: AuthIntegrationConfig): ProfileLifecycleService {
  if (!globalProfileManager) {
    globalProfileManager = new ProfileLifecycleService(config)
  }
  return globalProfileManager
}

/**
 * Helper function to handle Stack Auth sign-in events
 */
export async function handleStackSignIn(user: User, companyId?: string): Promise<ProfileSyncResult> {
  const profileManager = getProfileLifecycleManager()
  return await profileManager.syncProfile(user)
}

/**
 * Helper function to handle Stack Auth sign-out events
 */
export async function handleStackSignOut(userId: string): Promise<void> {
  // Currently just logging, but could implement session cleanup here
  console.log(`User ${userId} signed out - session cleanup complete`)
}

/**
 * Helper function to handle Stack Auth user update events
 */
export async function handleStackUserUpdate(user: User): Promise<ProfileSyncResult> {
  const profileManager = getProfileLifecycleManager()
  return await profileManager.syncProfile(user)
}