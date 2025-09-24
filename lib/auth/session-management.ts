"use client"

import type { User } from "@stackframe/stack"
import type { Profile } from "@/lib/database/queries/profiles"

/**
 * Session management utilities for handling authentication state persistence
 * and coordination between Stack auth and database profiles
 */
export class SessionManager {
  // Keys for session storage
  private static readonly PROFILE_CACHE_KEY = 'stratix_profile_cache'
  private static readonly SESSION_STATE_KEY = 'stratix_session_state'
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

  /**
   * Cache profile data locally to reduce database calls
   * @param profile - Profile data to cache
   */
  static cacheProfile(profile: Profile): void {
    try {
      const cacheData = {
        profile,
        timestamp: Date.now(),
      }
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(this.PROFILE_CACHE_KEY, JSON.stringify(cacheData))
      }
    } catch (error) {
      console.error('Error caching profile:', error)
    }
  }

  /**
   * Get cached profile if still valid
   * @returns Cached profile or null if expired/not found
   */
  static getCachedProfile(): Profile | null {
    try {
      if (typeof window === 'undefined') {
        return null
      }

      const cached = sessionStorage.getItem(this.PROFILE_CACHE_KEY)
      if (!cached) {
        return null
      }

      const cacheData = JSON.parse(cached)
      const isExpired = Date.now() - cacheData.timestamp > this.CACHE_DURATION

      if (isExpired) {
        this.clearProfileCache()
        return null
      }

      return cacheData.profile
    } catch (error) {
      console.error('Error getting cached profile:', error)
      return null
    }
  }

  /**
   * Clear profile cache
   */
  static clearProfileCache(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(this.PROFILE_CACHE_KEY)
      }
    } catch (error) {
      console.error('Error clearing profile cache:', error)
    }
  }

  /**
   * Store session state for persistence across page reloads
   * @param user - Stack user data
   * @param profile - Database profile data
   * @param isLoading - Loading state
   */
  static storeSessionState(user: User | null, profile: Profile | null, isLoading: boolean): void {
    try {
      const sessionState = {
        hasUser: Boolean(user),
        hasProfile: Boolean(profile),
        userId: user?.id || null,
        isLoading,
        timestamp: Date.now(),
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem(this.SESSION_STATE_KEY, JSON.stringify(sessionState))
      }
    } catch (error) {
      console.error('Error storing session state:', error)
    }
  }

  /**
   * Get stored session state
   * @returns Stored session state or null
   */
  static getSessionState(): {
    hasUser: boolean
    hasProfile: boolean
    userId: string | null
    isLoading: boolean
    timestamp: number
  } | null {
    try {
      if (typeof window === 'undefined') {
        return null
      }

      const stored = sessionStorage.getItem(this.SESSION_STATE_KEY)
      if (!stored) {
        return null
      }

      return JSON.parse(stored)
    } catch (error) {
      console.error('Error getting session state:', error)
      return null
    }
  }

  /**
   * Clear all session data on logout
   */
  static clearSession(): void {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(this.PROFILE_CACHE_KEY)
        sessionStorage.removeItem(this.SESSION_STATE_KEY)
      }
    } catch (error) {
      console.error('Error clearing session:', error)
    }
  }

  /**
   * Check if we should attempt to restore session on app initialization
   * @returns Boolean indicating if session restoration should be attempted
   */
  static shouldRestoreSession(): boolean {
    try {
      const sessionState = this.getSessionState()
      
      if (!sessionState) {
        return false
      }

      // Don't restore if session is too old (1 hour)
      const isOld = Date.now() - sessionState.timestamp > 60 * 60 * 1000
      if (isOld) {
        this.clearSession()
        return false
      }

      return sessionState.hasUser
    } catch (error) {
      console.error('Error checking session restoration:', error)
      return false
    }
  }

  /**
   * Create loading state manager for complex async operations
   * @returns Object with loading state management methods
   */
  static createLoadingManager() {
    let loadingTimeout: NodeJS.Timeout | null = null

    return {
      setLoading: (callback: (loading: boolean) => void, delay = 100) => {
        // Clear any existing timeout
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
        }

        // Set loading with small delay to prevent flashing
        loadingTimeout = setTimeout(() => {
          callback(true)
          loadingTimeout = null
        }, delay)
      },

      clearLoading: (callback: (loading: boolean) => void) => {
        // Clear timeout if still pending
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
          loadingTimeout = null
        }
        
        callback(false)
      },

      cleanup: () => {
        if (loadingTimeout) {
          clearTimeout(loadingTimeout)
          loadingTimeout = null
        }
      }
    }
  }

  /**
   * Handle authentication state changes with proper error recovery
   * @param user - Current Stack user
   * @param onStateChange - Callback for state changes
   * @returns Promise that resolves when state change is processed
   */
  static async handleAuthStateChange(
    user: User | null,
    onStateChange: (user: User | null, profile: Profile | null, loading: boolean) => void
  ): Promise<void> {
    try {
      // Store session state immediately
      this.storeSessionState(user, null, true)
      
      // Call state change with loading state
      onStateChange(user, null, true)

      // If no user, clear everything and return
      if (!user) {
        this.clearSession()
        onStateChange(null, null, false)
        return
      }

      // User exists, we'll let the main auth hook handle profile loading
      // This is just for session state management
      
    } catch (error) {
      console.error('Error handling auth state change:', error)
      // On error, clear loading state
      onStateChange(user, null, false)
    }
  }

  /**
   * Get default company ID for new user profiles
   * This could be enhanced to support company selection or invitation codes
   * @returns Default company ID
   */
  static getDefaultCompanyId(): string {
    // For now, return a default company ID
    // In a production app, this could be based on:
    // - Company invitation codes
    // - User domain analysis
    // - Configuration settings
    return 'default-company-id'
  }
}