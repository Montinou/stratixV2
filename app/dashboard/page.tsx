<<<<<<< Updated upstream
import { neonServerClient } from "@/lib/neon-auth/server"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getCurrentProfile } from "@/lib/actions/profiles"

export default async function DashboardPage() {
  // Check authentication
  const user = await neonServerClient.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile, error } = await getCurrentProfile()
  if (error || !profile) {
    redirect("/auth/login")
=======
"use client"

import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
>>>>>>> Stashed changes
  }

  return <DashboardContent profile={profile} />
}
