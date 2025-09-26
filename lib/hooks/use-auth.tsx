"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useUser as useStackUser } from '@stackframe/stack'

interface Profile {
  userId: string
  fullName: string
  roleType: 'corporativo' | 'gerente' | 'empleado'
  department: string
  companyId: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

interface Company {
  id: string
  name: string
  description?: string
  industry?: string
  size?: string
  createdAt: string
  updatedAt: string
}

interface AuthUser {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  stackUserId: string
}

interface AuthContextType {
  user: AuthUser | null
  profile: Profile | null
  company: Company | null
  loading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const stackUser = useStackUser()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  // Handle client-side hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  const fetchProfile = useCallback(
    async (currentUser: AuthUser) => {
      try {
        // Fetch profile data from API using Stack Auth user ID
        const profileResponse = await fetch(`/api/profiles/stack/${currentUser.stackUserId}`)
        
        let profile: Profile | null = null
        let company: Company | null = null

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          if (profileData.success && profileData.data) {
            profile = profileData.data
          }
        }

        // If no profile exists, try to create one or this might be a new user
        if (!profile) {
          console.warn("No profile found for Stack Auth user, attempting to sync user with database")
          
          // Try to sync user with database
          try {
            const syncResponse = await fetch('/api/auth/sync-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            })
            
            if (syncResponse.ok) {
              const syncData = await syncResponse.json()
              if (syncData.success && syncData.profile) {
                profile = syncData.profile
                company = syncData.company
              }
            }
          } catch (syncError) {
            console.warn("Error syncing user with database:", syncError)
          }
          
          return { profile, company }
        }

        // Fetch company data based on profile.companyId
        if (profile?.companyId) {
          try {
            const companyResponse = await fetch(`/api/companies/${profile.companyId}`)
            if (companyResponse.ok) {
              const companyResult = await companyResponse.json()
              if (companyResult.success && companyResult.data) {
                company = companyResult.data
              }
            }
          } catch (error) {
            console.warn("Error fetching company data:", error)
            // Continue without company data
          }
        }

        return { profile, company }
      } catch (error) {
        console.error("Error fetching profile:", error)
        return { profile: null, company: null }
      }
    },
    []
  )

  const refreshProfile = useCallback(async () => {
    if (user) {
      const { profile: profileData, company: companyData } = await fetchProfile(user)
      setProfile(profileData)
      setCompany(companyData)
    }
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    try {
      // Sign out from Stack Auth
      if (stackUser) {
        await stackUser.signOut()
      }
      
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
  }, [stackUser])

  // Effect to sync Stack Auth user state with our local state
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      // Only initialize auth on client-side after hydration
      if (!isClient) {
        return
      }

      try {
        // stackUser is undefined during loading, null when not authenticated, or User when authenticated
        if (stackUser === undefined) {
          // Still loading
          return
        }

        if (stackUser === null) {
          // Not authenticated
          if (mounted) {
            setUser(null)
            setProfile(null)
            setCompany(null)
            setLoading(false)
          }
          return
        }

        // User is authenticated
        const authUser: AuthUser = {
          id: stackUser.id,
          email: stackUser.primaryEmail || '',
          name: stackUser.displayName || undefined,
          avatarUrl: stackUser.profileImageUrl || undefined,
          stackUserId: stackUser.id
        }

        if (mounted) {
          setUser(authUser)
          setLoading(false)

          // Only fetch profile and company data if user is authenticated and valid
          if (authUser.stackUserId && authUser.email) {
            try {
              const { profile: profileData, company: companyData } = await fetchProfile(authUser)

              if (mounted) {
                setProfile(profileData)
                setCompany(companyData)
              }
            } catch (error) {
              console.error('Error fetching profile data:', error)
              // Continue without profile data
            }
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [stackUser, fetchProfile, isClient])

  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      company, 
      loading, 
      isAuthenticated, 
      signOut, 
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  // During SSR/SSG or build time, return a safe default state
  if (typeof window === 'undefined') {
    return {
      user: null,
      profile: null,
      company: null,
      loading: true, // Show loading during SSR to match client-side hydration
      isAuthenticated: false,
      signOut: async () => {},
      refreshProfile: async () => {}
    }
  }

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Legacy hook for compatibility - can be removed once all components are updated
export function useUser() {
  const { user, loading, isAuthenticated } = useAuth()
  
  return {
    user,
    isLoading: loading,
    isAuthenticated,
  }
}