import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

// Force dynamic rendering to avoid authentication issues during static generation
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  try {
    // Check authentication - use { or: "redirect" } for automatic redirect
    const user = await stackServerApp.getUser({ or: "redirect" })

    // For now, pass user data directly to dashboard
    // TODO: Integrate with profile system later
    const mockProfile = {
      id: user.id,
      user_id: user.id,
      name: user.displayName || user.primaryEmail || 'Usuario',
      email: user.primaryEmail || '',
      role: 'employee' as const,
      company_id: 1,
      avatar_url: user.profileImageUrl || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return <DashboardContent profile={mockProfile} />
  } catch (error) {
    // Handle authentication errors during build/runtime
    console.error('Dashboard authentication error:', error)
    redirect("/handler/sign-in")
  }
}
