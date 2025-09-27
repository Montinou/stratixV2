import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '@/stack'
import { db } from '@/lib/database/client'
import { users, profiles, companies } from '@/lib/database/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated Stack Auth user
    const user = await stackServerApp.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    // Check if user already exists in database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.stackUserId, user.id),
      with: {
        profile: {
          with: {
            company: true
          }
        }
      }
    })

    if (existingUser) {
      // User exists, return existing profile and company data
      return NextResponse.json({
        success: true,
        user: existingUser,
        profile: existingUser.profile,
        company: existingUser.profile?.company || null,
        message: 'User already exists in database'
      })
    }

    // Create new user in database
    const [newUser] = await db
      .insert(users)
      .values({
        stackUserId: user.id,
        email: user.primaryEmail!,
        name: user.displayName || null,
        avatarUrl: user.profileImageUrl || null,
        // For now, we'll create without tenant_id - this should be set when user joins a company
        tenantId: null,
      })
      .returning()

    console.log('Created new user in database:', newUser)

    // Note: Profile creation should happen through a separate onboarding flow
    // where the user selects their company, department, role, etc.
    // For now, we return the user without a profile

    return NextResponse.json({
      success: true,
      user: newUser,
      profile: null,
      company: null,
      message: 'User synced to database successfully. Profile creation needed.',
      needsOnboarding: true
    })

  } catch (error) {
    console.error('Error syncing user with database:', error)
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

// GET method to check sync status
export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      )
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.stackUserId, user.id),
      with: {
        profile: {
          with: {
            company: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      isSynced: !!existingUser,
      user: existingUser || null,
      profile: existingUser?.profile || null,
      company: existingUser?.profile?.company || null,
      needsOnboarding: !existingUser?.profile
    })

  } catch (error) {
    console.error('Error checking user sync status:', error)
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