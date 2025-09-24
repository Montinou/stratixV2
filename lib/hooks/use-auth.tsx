"use client"

import type React from "react"

import { createNeonClient } from "@/lib/neon-auth/client"
import type { User } from "@stackframe/stack"
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
// Temporarily commented out during build fix - these import server-side database code
// import { StackProfileBridge } from "@/lib/auth/stack-profile-bridge"
// import { SessionManager } from "@/lib/auth/session-management"
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

        // TODO: Fetch company data based on profile.company_id
        // For now, return mock company data
        const mockCompany: Company = {
          id: profile.company_id,
          name: "Default Company",
          slug: "default",
          logo_url: null,
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        return {
          profile,
          company: mockCompany,
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

    const getInitialSession = async () => {
      try {
        const user = neonClient.getUser()

        if (!mounted) return

        if (user) {
          setUser(user)
          
          // Set loading state with manager
          loadingManager.setLoading(setLoading, 50)
          
          const { profile: profileData, company: companyData } = await fetchProfile(user)
          if (mounted) {
            setProfile(profileData)
            setCompany(companyData)
            
            // Store session state for persistence
            SessionManager.storeSessionState(user, profileData, false)
          }
        }
        
        if (mounted) {
          loadingManager.clearLoading(setLoading)
        }
      } catch (error) {
        console.error("Error getting initial session:", error)
        if (mounted) {
          loadingManager.clearLoading(setLoading)
        }
      }
    }

    getInitialSession()

    // Set up auth state change listener with session management
    const unsubscribe = neonClient.onUserChange(async (user) => {
      if (!mounted) return

      try {
        // Handle auth state change through session manager
        await SessionManager.handleAuthStateChange(user, (currentUser, currentProfile, loading) => {
          if (mounted) {
            setUser(currentUser)
            setProfile(currentProfile)
            setLoading(loading)
          }
        })

        if (user) {
          // User signed in - fetch profile data
          if (mounted) {
            setUser(user)
            loadingManager.setLoading(setLoading, 50)
          }
          
          const { profile: profileData, company: companyData } = await fetchProfile(user)
          
          if (mounted) {
            setProfile(profileData)
            setCompany(companyData)
            
            // Store session state for persistence
            SessionManager.storeSessionState(user, profileData, false)
            loadingManager.clearLoading(setLoading)
          }
        } else {
          // User signed out - clear everything
          if (mounted) {
            setUser(null)
            setProfile(null)
            setCompany(null)
            loadingManager.clearLoading(setLoading)
          }
        }
      } catch (error) {
        console.error("Error in auth state change:", error)
        if (mounted) {
          loadingManager.clearLoading(setLoading)
        }
      }
    })

    return () => {
      mounted = false
      loadingManager.cleanup()
      unsubscribe()
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
