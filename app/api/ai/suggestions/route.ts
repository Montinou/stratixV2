import { type NextRequest, NextResponse } from "next/server"
import { generateOKRSuggestions } from "@/lib/ai/suggestions"
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
    const { title, description, department, companyContext } = body

    const suggestions = await generateOKRSuggestions({
      title,
      description,
      department,
      userRole: "corporativo",
      companyContext,
    })

    // Store suggestion in database for analytics
    await supabase.from("ai_suggestions").insert({
      user_id: user.id,
      suggestion_type: "okr_generation",
      input_data: { title, description, department },
      output_data: suggestions,
    })

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
