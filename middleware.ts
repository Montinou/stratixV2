import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Skip middleware for static files
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('.') && !pathname.includes('/api/')
  ) {
    return NextResponse.next()
  }

  // With nextjs-cookie token store, no middleware is needed for Stack Auth
  // Authentication is handled directly in components and API routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
