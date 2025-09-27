import { type NextRequest, NextResponse } from "next/server"
import { generateSmartSuggestions } from "@/lib/ai/suggestions"
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
