import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardContent } from "@/components/dashboard/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
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
    .eq("id", user.id)
    .single()

  return <DashboardContent user={user} profile={profile} />
}
