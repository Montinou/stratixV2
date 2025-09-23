import { NextResponse, type NextRequest } from "next/server"

// Simplified middleware for NeonAuth compatibility with Edge Runtime
// Since NeonAuth server client has Edge Runtime compatibility issues,
// we'll handle authentication client-side and use this middleware mainly for routing
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  // For now, allow all requests through since NeonAuth will handle
  // authentication on the client side. This avoids Edge Runtime issues.
  // If server-side auth checking is needed later, it should be done
  // in page components using the server client.
  
  return response
}