import { NextResponse } from "next/server"

// NeonAuth handles authentication differently than Supabase
// This callback route may not be needed for NeonAuth, but keeping it for compatibility
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  const next = "/dashboard"

  // For NeonAuth, we can directly redirect to the dashboard
  // since authentication is handled by the NeonAuth provider
  return NextResponse.redirect(`${origin}${next}`)
}
