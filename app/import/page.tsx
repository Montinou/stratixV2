import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/actions/profiles"

// Force dynamic rendering to avoid authentication issues during static generation
export const dynamic = 'force-dynamic'

export default async function ImportPage() {
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

    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Importar Datos</h1>
        <div className="text-center py-8">
          <p className="text-gray-600">Funcionalidad de importación en desarrollo</p>
        </div>
      </div>
    )
  } catch (error) {
    // Handle authentication errors during build/runtime
    console.error('Import page authentication error:', error)
    redirect("/handler/sign-in")
  }
}
