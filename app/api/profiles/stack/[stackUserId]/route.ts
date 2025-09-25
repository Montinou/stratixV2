import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { db } from '@/lib/database/client'
import { users, profiles } from '@/lib/database/schema'
import { eq } from 'drizzle-orm'

interface RouteParams {
  params: {
    stackUserId: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    // Check that the requested user matches the authenticated user
    if (user.id !== params.stackUserId) {
      return NextResponse.json(
        { error: 'Forbidden - can only access own profile', success: false },
        { status: 403 }
      )
    }

    // Find the user by Stack Auth ID
    const dbUser = await db.query.users.findFirst({
      where: eq(users.stackUserId, params.stackUserId),
      with: {
        profile: {
          with: {
            company: true
          }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database', success: false, needsSync: true },
        { status: 404 }
      )
    }

    if (!dbUser.profile) {
      return NextResponse.json(
        { error: 'Profile not found', success: false, needsOnboarding: true },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: dbUser.profile
    })

  } catch (error) {
    console.error('Error fetching profile by Stack Auth ID:', error)
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}