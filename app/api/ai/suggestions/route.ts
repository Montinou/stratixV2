import { type NextRequest, NextResponse } from "next/server"
import { generateOKRSuggestions } from "@/lib/ai/suggestions"
import { stackServerApp } from "@/stack"

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication with Stack Auth
    const user = await stackServerApp.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // TODO: Check if user has corporate role when profile system is implemented
    // For now, allow all authenticated users

    const body = await request.json()
    const { title, description, department, companyContext } = body

    const suggestions = await generateOKRSuggestions({
      title,
      description,
      department,
      userRole: "corporativo",
      companyContext,
    })

    // TODO: Store suggestion in database for analytics when implemented

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
