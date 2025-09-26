import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getCurrentProfile } from "@/lib/actions/profiles"

// Force dynamic rendering to avoid authentication issues during static generation
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  try {
    // Check authentication
    const user = await stackServerApp.getUser()
    if (!user) {
      redirect("/handler/sign-in")
    }

    // Get user profile
    const { data: profile, error } = await getCurrentProfile()
    if (error || !profile) {
      redirect("/handler/sign-in")
    }

    return <DashboardContent profile={profile} />
  } catch (error) {
    // Handle authentication errors during build/runtime
    console.error('Dashboard authentication error:', error)
    redirect("/handler/sign-in")
  }
}
