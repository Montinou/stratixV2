"use client"

import type React from "react"

import { createNeonClient } from "@/lib/neon-auth/client"
import type { User } from "@stackframe/stack"
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"

interface Profile {
  id: string
  email: string
  full_name: string
  role: "corporativo" | "gerente" | "empleado"
  department: string | null
  manager_id: string | null
  company_id: string | null
  created_at: string
  updated_at: string
}

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
    async (userId: string) => {
      try {
        const userData = await neonClient.getUser()
        if (!userData) {
          return { profile: null, company: null }
        }

        // Fetch profile from database
        const response = await fetch('/api/profiles/me', {
          headers: {
            'Authorization': `Bearer ${await neonClient.getAccessToken()}`,
          },
        })

        if (response.ok) {
          const { profile: profileData, company: companyData } = await response.json()
          return { profile: profileData, company: companyData }
        } else {
          // If profile doesn't exist, create a default one
          const createResponse = await fetch('/api/profiles', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await neonClient.getAccessToken()}`,
            },
            body: JSON.stringify({
              user_id: userData.id,
              full_name: userData.displayName || userData.primaryEmail || '',
              role_type: "empleado",
              department: null,
              company_id: null,
            }),
          })

          if (createResponse.ok) {
            const { profile: newProfile, company: newCompany } = await createResponse.json()
            return { profile: newProfile, company: newCompany }
          }
        }

        return { profile: null, company: null }
      } catch (error) {
        console.error("Error fetching profile:", error)
        return { profile: null, company: null }
      }
    },
    [neonClient],
  )

  const refreshProfile = useCallback(async () => {
    if (user) {
      const { profile: profileData, company: companyData } = await fetchProfile(user.id)
      setProfile(profileData)
      setCompany(companyData)
    }
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    await neonClient.signOut()
    setUser(null)
    setProfile(null)
    setCompany(null)
  }, [neonClient])

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

    const getInitialSession = async () => {
      try {
        const user = neonClient.getUser()

        if (!mounted) return

        if (user) {
          setUser(user)
          const { profile: profileData, company: companyData } = await fetchProfile(user.id)
          if (mounted) {
            setProfile(profileData)
            setCompany(companyData)
          }
        }
        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error getting initial session:", error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Set up auth state change listener
    const unsubscribe = neonClient.onUserChange(async (user) => {
      if (!mounted) return

      try {
        if (user) {
          setUser(user)
          const { profile: profileData, company: companyData } = await fetchProfile(user.id)
          if (mounted) {
            setProfile(profileData)
            setCompany(companyData)
          }
        } else {
          if (mounted) {
            setUser(null)
            setProfile(null)
            setCompany(null)
          }
        }
        if (mounted) {
          setLoading(false)
        }
      } catch (error) {
        console.error("Error in auth state change:", error)
        if (mounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
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
