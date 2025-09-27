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

    // User authentication is sufficient for suggestions
    // Role-based access control can be added later if needed

    const body = await request.json()
    const { title, description, department, companyContext } = body

    const suggestions = await generateOKRSuggestions({
      title,
      description,
      department,
      userRole: "corporativo",
      companyContext,
    })

    // Suggestion analytics can be added later when needed

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error("Error generating suggestions:", error)
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
