import { type NextRequest, NextResponse } from "next/server"
import { generateSmartSuggestions } from "@/lib/ai/suggestions"
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
