"use client"

import type React from "react"

import { createNeonClient } from "@/lib/neon-auth/client"
import type { User } from "@stackframe/stack"
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
// Using real authentication implementations with API integration (client-side)
import { StackProfileBridge } from "@/lib/auth/stack-profile-bridge-client"
import { SessionManager } from "@/lib/auth/session-management"
import type { Profile } from "@/lib/database/queries/profiles"

interface Company {
  id: string
  name: string
  slug: string
  logo_url: string | null
  settings: any
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  company: Company | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Create neon client once using useMemo to prevent recreating on every render
  const neonClient = useMemo(() => createNeonClient(), [])

  const fetchProfile = useCallback(
    async (stackUser: User) => {
      try {
        // First check if we have cached profile data
        const cachedProfile = SessionManager.getCachedProfile()
        if (cachedProfile && cachedProfile.user_id === stackUser.id) {
          return { 
            profile: cachedProfile, 
            company: null // TODO: Add company caching in future
          }
        }

        // Get default company ID for new profiles
        const defaultCompanyId = SessionManager.getDefaultCompanyId()
        
        // Use the bridge to get or create profile
        const profile = await StackProfileBridge.getOrCreateProfile(stackUser, defaultCompanyId)
        
        if (!profile) {
          console.warn("Could not get or create profile, using fallback")
          const fallbackProfile = StackProfileBridge.createFallbackProfile(stackUser)
          return { profile: fallbackProfile, company: null }
        }

        // Cache the profile for better performance
        SessionManager.cacheProfile(profile)

        // Fetch company data based on profile.companyId
        let company: Company | null = null
        
        try {
          const companyResponse = await fetch(`/api/companies/${profile.companyId}`)
          if (companyResponse.ok) {
            const companyResult = await companyResponse.json()
            if (companyResult.success && companyResult.data) {
              company = {
                id: companyResult.data.id,
                name: companyResult.data.name,
                slug: companyResult.data.slug || companyResult.data.name.toLowerCase().replace(/\s+/g, '-'),
                logo_url: companyResult.data.logoUrl || null,
                settings: companyResult.data.settings || {},
                created_at: companyResult.data.createdAt,
                updated_at: companyResult.data.updatedAt,
              }
            }
          }
        } catch (error) {
          console.warn("Error fetching company data:", error)
          // Continue without company data
        }

        return {
          profile,
          company,
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        
        // On error, create fallback profile from Stack user data
        const fallbackProfile = StackProfileBridge.createFallbackProfile(stackUser)
        return { profile: fallbackProfile, company: null }
      }
    },
    [neonClient], // neonClient is stable due to useMemo
  )

  const refreshProfile = useCallback(async () => {
    if (user) {
      // Clear cached profile to force fresh fetch
      SessionManager.clearProfileCache()
      const { profile: profileData, company: companyData } = await fetchProfile(user)
      setProfile(profileData)
      setCompany(companyData)
    }
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    try {
      // Handle logout cleanup through bridge
      if (user) {
        await StackProfileBridge.handleLogout(user.id)
      }
      
      // Clear all session data
      SessionManager.clearSession()
      
      // Sign out from Stack
      await neonClient.signOut()
      
      // Clear local state
      setUser(null)
      setProfile(null)
      setCompany(null)
    } catch (error) {
      console.error("Error during sign out:", error)
      // Even if there's an error, clear local state
      setUser(null)
      setProfile(null)
      setCompany(null)
    }
  }, [neonClient, user])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await neonClient.signInWithCredential({ email, password })
      // User state will be updated by the auth state change listener
    } catch (error) {
      console.error("Error signing in:", error)
      throw error
    }
  }, [neonClient])

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      await neonClient.signUpWithCredential({ 
        email, 
        password,
        ...(displayName && { displayName })
      })
      // User state will be updated by the auth state change listener
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    }
  }, [neonClient])

  useEffect(() => {
    let mounted = true
    const loadingManager = SessionManager.createLoadingManager()

    const initializeAuth = async () => {
      try {
        // Get initial user state
        const initialUser = neonClient.getUser()

        if (!mounted) return

        if (initialUser) {
          setUser(initialUser)
          
          // Set loading state with manager
          loadingManager.setLoading(setLoading, 50)
          
          const { profile: profileData, company: companyData } = await fetchProfile(initialUser)
          if (mounted) {
            setProfile(profileData)
            setCompany(companyData)
            
            // Store session state for persistence
            SessionManager.storeSessionState(initialUser, profileData, false)
          }
        }
        
        if (mounted) {
          loadingManager.clearLoading(setLoading)
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        if (mounted) {
          loadingManager.clearLoading(setLoading)
        }
      }
    }

    initializeAuth()

    // Set up periodic user state check (Stack Auth doesn't have onUserChange)
    const checkUserState = async () => {
      if (!mounted) return

      try {
        const currentUser = neonClient.getUser()
        
        // Only update if user state actually changed
        if (currentUser?.id !== user?.id) {
          if (currentUser) {
            // User signed in or changed
            setUser(currentUser)
            loadingManager.setLoading(setLoading, 50)
            
            const { profile: profileData, company: companyData } = await fetchProfile(currentUser)
            
            if (mounted) {
              setProfile(profileData)
              setCompany(companyData)
              SessionManager.storeSessionState(currentUser, profileData, false)
              loadingManager.clearLoading(setLoading)
            }
          } else {
            // User signed out
            if (mounted) {
              setUser(null)
              setProfile(null)
              setCompany(null)
              SessionManager.clearSession()
              loadingManager.clearLoading(setLoading)
            }
          }
        }
      } catch (error) {
        console.error("Error in auth state change:", error)
        if (mounted) {
          loadingManager.clearLoading(setLoading)
        }
      }
    }

    // Set up interval for periodic user state checking
    const checkInterval = setInterval(checkUserState, 5000) // Check every 5 seconds

    return () => {
      mounted = false
      loadingManager.cleanup()
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    }
  }, [neonClient, fetchProfile])

  return (
    <AuthContext.Provider value={{ user, profile, company, loading, signOut, refreshProfile, signIn, signUp }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
