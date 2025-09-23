import { NextResponse, type NextRequest } from "next/server"

/**
 * Legacy middleware function for compatibility.
 * 
 * Note: The actual middleware has been migrated to use NeonAuth in /middleware.ts
 * and /lib/neon-auth/middleware.ts as part of Task #10.
 * 
 * This file is kept for compatibility during the transition and will be
 * removed in Task #7 (Database Client Migration).
 */
export async function updateSession(request: NextRequest) {
  // Simple pass-through - actual auth handling is now done by NeonAuth middleware
  // See /middleware.ts and /lib/neon-auth/middleware.ts for the new implementation
  
  return NextResponse.next({
    request,
  })
}
