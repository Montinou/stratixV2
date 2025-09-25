import { type NextRequest, NextResponse } from "next/server"
import { generateOKRSuggestions } from "@/lib/ai/suggestions"
import { stackServerApp } from "@/stack"

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { user, error: authError } = await verifyAuthentication(request)
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has corporate role
    const isCorporate = await verifyUserRole(user.id, "corporativo")
    if (!isCorporate) {
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
    await storeAISuggestion(
      user.id,
      "okr_generation",
      { title, description, department },
      suggestions
    )

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
