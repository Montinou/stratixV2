import type { User } from "@stackframe/stack"
import type { StackClientApp } from "@stackframe/stack"
import type { 
  AuthIntegrationConfig,
  ProfileSyncResult,
  SessionManager,
  DEFAULT_AUTH_CONFIG
} from "@/lib/types/auth-integration"
import { AuthIntegrationError } from "@/lib/types/auth-integration"
import { getStackAuthEventManager } from "@/lib/auth/stack-events"
import { 
  getProfileLifecycleManager,
  handleStackSignIn,
  handleStackSignOut,
  handleStackUserUpdate 
} from "@/lib/auth/profile-lifecycle"

/**
 * Authentication Synchronization Middleware
 * 
 * Central coordinator that ties together Stack Auth events with profile lifecycle management.
 * This middleware ensures seamless integration between authentication and profile persistence.
 */

export class AuthSyncManager implements SessionManager {
  private config: AuthIntegrationConfig
  private isInitialized = false
  private currentUser: User | null = null
  private currentProfile: ProfileSyncResult | null = null

  constructor(config: AuthIntegrationConfig = DEFAULT_AUTH_CONFIG) {
    this.config = config
  }

  /**
   * Initialize the authentication synchronization system
   */
  public async initialize(stackClient: StackClientApp): Promise<void> {
    if (this.isInitialized) {
      console.warn('AuthSyncManager is already initialized')
      return
    }

    try {
      console.log('Initializing AuthSyncManager...')

      // Get event manager and profile manager
      const eventManager = getStackAuthEventManager(this.config)
      const profileManager = getProfileLifecycleManager(this.config)

      // Register event handlers
      eventManager.registerHandlers({
        onSignIn: async (payload) => {
          if (payload.user) {
            await this.handleSignIn(payload.user)
          }
        },
        onSignOut: async (payload) => {
          await this.handleSignOut()
        },
        onUserUpdate: async (payload) => {
          if (payload.user) {
            await this.handleUserUpdate(payload.user)
          }
        },
      })

      // Start listening to Stack Auth events
      eventManager.startListening(stackClient)

      // Check for existing session
      const existingUser = stackClient.getUser()
      if (existingUser) {
        console.log('Found existing user session, syncing profile...')
        await this.handleSignIn(existingUser)
      }

      this.isInitialized = true
      console.log('AuthSyncManager initialized successfully')

    } catch (error) {
      console.error('Failed to initialize AuthSyncManager:', error)
      throw new AuthIntegrationError(
        'Failed to initialize authentication synchronization',
        'SYNC_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Handle user sign-in event
   */
  private async handleSignIn(user: User): Promise<void> {
    try {
      console.log(`Handling sign-in for user ${user.id}`)

      // Update current user state
      this.currentUser = user

      // Sync or create profile
      const profileResult = await handleStackSignIn(user)
      this.currentProfile = profileResult

      if (profileResult.status === 'error') {
        console.error('Profile sync failed during sign-in:', profileResult.error)
        throw new AuthIntegrationError(
          `Profile sync failed: ${profileResult.error}`,
          'SYNC_ERROR'
        )
      }

      console.log(`Sign-in complete for user ${user.id}`)

    } catch (error) {
      console.error('Error handling sign-in:', error)
      throw new AuthIntegrationError(
        'Failed to handle user sign-in',
        'SYNC_ERROR',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Handle user sign-out event
   */
  private async handleSignOut(): Promise<void> {
    try {
      const userId = this.currentUser?.id || 'unknown'
      console.log(`Handling sign-out for user ${userId}`)

      // Clear session data
      this.clearSession()

      // Handle any cleanup
      await handleStackSignOut(userId)

      console.log(`Sign-out complete for user ${userId}`)

    } catch (error) {
      console.error('Error handling sign-out:', error)
      // Don't throw here as sign-out should always succeed
    }
  }

  /**
   * Handle user data update event
   */
  private async handleUserUpdate(user: User): Promise<void> {
    try {
      console.log(`Handling user update for user ${user.id}`)

      // Update current user state
      this.currentUser = user

      // Sync profile with updated user data
      const profileResult = await handleStackUserUpdate(user)
      this.currentProfile = profileResult

      if (profileResult.status === 'error') {
        console.error('Profile sync failed during user update:', profileResult.error)
        // Don't throw here as user updates should be resilient
      } else {
        console.log(`User update complete for user ${user.id}`)
      }

    } catch (error) {
      console.error('Error handling user update:', error)
      // Don't throw here as user updates should be resilient
    }
  }

  /**
   * Refresh current session and profile data
   */
  public async refreshSession(userId: string): Promise<ProfileSyncResult> {
    try {
      console.log(`Refreshing session for user ${userId}`)

      const profileManager = getProfileLifecycleManager(this.config)
      const profileResult = await profileManager.getProfileData(userId)

      // Update current session state
      this.currentProfile = profileResult

      console.log(`Session refresh complete for user ${userId}`)
      return profileResult

    } catch (error) {
      console.error('Error refreshing session:', error)
      
      const errorResult: ProfileSyncResult = {
        status: 'error',
        profile: null,
        company: null,
        error: error instanceof Error ? error.message : 'Unknown error refreshing session',
      }

      this.currentProfile = errorResult
      return errorResult
    }
  }

  /**
   * Clear current session data
   */
  public clearSession(): void {
    console.log('Clearing session data')
    this.currentUser = null
    this.currentProfile = null
  }

  /**
   * Check if current session is valid
   */
  public isSessionValid(): boolean {
    return this.currentUser !== null && 
           this.currentProfile !== null && 
           this.currentProfile.status === 'synced'
  }

  /**
   * Get current user
   */
  public getCurrentUser(): User | null {
    return this.currentUser
  }

  /**
   * Get current profile data
   */
  public getCurrentProfile(): ProfileSyncResult | null {
    return this.currentProfile
  }

  /**
   * Force profile resync for current user
   */
  public async resyncProfile(): Promise<ProfileSyncResult | null> {
    if (!this.currentUser) {
      console.warn('Cannot resync profile: no current user')
      return null
    }

    try {
      const profileResult = await handleStackUserUpdate(this.currentUser)
      this.currentProfile = profileResult
      return profileResult
    } catch (error) {
      console.error('Error resyncing profile:', error)
      return null
    }
  }

  /**
   * Check initialization status
   */
  public isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AuthIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Update configs in dependent services
    const eventManager = getStackAuthEventManager()
    const profileManager = getProfileLifecycleManager()
    
    eventManager.updateConfig(this.config)
    profileManager.updateConfig(this.config)
  }

  /**
   * Get current configuration
   */
  public getConfig(): AuthIntegrationConfig {
    return { ...this.config }
  }

  /**
   * Cleanup and shutdown
   */
  public async cleanup(): Promise<void> {
    console.log('Cleaning up AuthSyncManager...')

    try {
      // Stop listening to events
      const eventManager = getStackAuthEventManager()
      eventManager.cleanup()

      // Clear session
      this.clearSession()

      this.isInitialized = false
      console.log('AuthSyncManager cleanup complete')

    } catch (error) {
      console.error('Error during AuthSyncManager cleanup:', error)
    }
  }
}

// Singleton instance for global use
let globalAuthSyncManager: AuthSyncManager | null = null

/**
 * Get or create the global authentication synchronization manager
 */
export function getAuthSyncManager(config?: AuthIntegrationConfig): AuthSyncManager {
  if (!globalAuthSyncManager) {
    globalAuthSyncManager = new AuthSyncManager(config)
  }
  return globalAuthSyncManager
}

/**
 * Initialize authentication synchronization with Stack Auth
 */
export async function initializeAuthSync(
  stackClient: StackClientApp,
  config?: AuthIntegrationConfig
): Promise<AuthSyncManager> {
  const authSyncManager = getAuthSyncManager(config)
  await authSyncManager.initialize(stackClient)
  return authSyncManager
}

/**
 * Cleanup global authentication synchronization
 */
export async function cleanupAuthSync(): Promise<void> {
  if (globalAuthSyncManager) {
    await globalAuthSyncManager.cleanup()
    globalAuthSyncManager = null
  }
}

/**
 * Get current authentication state
 */
export function getAuthState(): {
  user: User | null
  profile: ProfileSyncResult | null
  isValid: boolean
  isReady: boolean
} {
  const manager = globalAuthSyncManager

  return {
    user: manager?.getCurrentUser() || null,
    profile: manager?.getCurrentProfile() || null,
    isValid: manager?.isSessionValid() || false,
    isReady: manager?.isReady() || false,
  }
}