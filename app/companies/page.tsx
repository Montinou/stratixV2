import { stackServerApp } from "@/stack"
import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/actions/profiles"
import { CompaniesContent } from "@/components/companies/companies-content"

// Force dynamic rendering to avoid authentication issues during static generation
export const dynamic = 'force-dynamic'

export default async function CompaniesPage() {
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

    return <CompaniesContent profile={profile} />
  } catch (error) {
    // Handle authentication errors during build/runtime
    console.error('Companies page authentication error:', error)
    redirect("/handler/sign-in")
  }
}
