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
  }

  return <DashboardContent profile={profile} />
}
