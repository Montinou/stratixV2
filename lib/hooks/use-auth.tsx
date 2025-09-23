"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useState, useCallback } from "react"

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
          *,
          companies (
            id,
            name,
            slug,
            logo_url,
            settings,
            created_at,
            updated_at
          )
        `)
          .eq("id", userId)
          .single()

        if (error) {
          console.error("Error fetching profile:", error)
          return { profile: null, company: null }
        }

        return {
          profile: data as Profile,
          company: data.companies as Company,
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        return { profile: null, company: null }
      }
    },
    [supabase],
  )

  const refreshProfile = useCallback(async () => {
    if (user) {
      const { profile: profileData, company: companyData } = await fetchProfile(user.id)
      setProfile(profileData)
      setCompany(companyData)
    }
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setCompany(null)
  }, [supabase.auth])

  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (!mounted) return

        if (error) {
          console.error("Error getting user:", error)
          if (mounted) {
            setUser(null)
            setProfile(null)
            setCompany(null)
            setLoading(false)
          }
          return
        }

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      try {
        if (session?.user) {
          setUser(session.user)
          const { profile: profileData, company: companyData } = await fetchProfile(session.user.id)
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
      subscription.unsubscribe()
    }
  }, [supabase.auth, fetchProfile])

  return (
    <AuthContext.Provider value={{ user, profile, company, loading, signOut, refreshProfile }}>
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
