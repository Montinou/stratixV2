import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard/dashboard-content"
import { getCurrentProfile } from "@/lib/actions/profiles"

// Force dynamic rendering to avoid authentication issues during static generation
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  try {
    // Check authentication - use { or: "redirect" } for automatic redirect
    const user = await stackServerApp.getUser({ or: "redirect" })

    // Get user profile
    const { data: profile, error } = await getCurrentProfile()

    // If no profile exists, redirect to onboarding
    if (!profile) {
      redirect("/onboarding")
    }

    return <DashboardContent profile={profile} />
  } catch (error) {
    // Handle authentication errors during build/runtime
    console.error('Dashboard authentication error:', error)
    redirect("/handler/sign-in")
  }
}
