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

    // If no profile exists, show onboarding message
    if (!profile) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">¡Bienvenido {user.displayName || user.primaryEmail}!</h1>
            <p className="text-muted-foreground">Tu perfil será configurado próximamente.</p>
            <p className="text-sm text-muted-foreground">Onboarding en desarrollo...</p>
          </div>
        </div>
      )
    }

    return <DashboardContent profile={profile} />
  } catch (error) {
    // Handle authentication errors during build/runtime
    console.error('Dashboard authentication error:', error)
    redirect("/handler/sign-in")
  }
}
