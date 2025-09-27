import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/actions/profiles"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

// Force dynamic rendering to avoid authentication issues during static generation
export const dynamic = 'force-dynamic'

function InitiativesContent({ profile }: { profile: any }) {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Iniciativas</h1>
          <p className="text-muted-foreground">Gestión de iniciativas estratégicas</p>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Funcionalidad de iniciativas en desarrollo</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default async function InitiativesPage() {
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

    return <InitiativesContent profile={profile} />
  } catch (error) {
    // Handle authentication errors during build/runtime
    console.error('Initiatives page authentication error:', error)
    redirect("/handler/sign-in")
  }
}