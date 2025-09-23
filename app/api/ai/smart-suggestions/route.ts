import { type NextRequest, NextResponse } from "next/server"
import { generateSmartSuggestions } from "@/lib/ai/suggestions"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to check if they're corporate
    const { data: profile } = await supabase.from("user_profiles").select("role_type").eq("user_id", user.id).single()

    if (profile?.role_type !== "corporativo") {
      return NextResponse.json({ error: "Feature only available for corporate users" }, { status: 403 })
    }

    const body = await request.json()
    const { input, department } = body

    const suggestions = await generateSmartSuggestions(input, {
      department,
      userRole: "corporativo",
    })

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Error generating smart suggestions:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
