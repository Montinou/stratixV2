import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDrizzleClient, testAuthenticatedConnection } from '@/lib/database/client';
import { users, profiles } from '@/lib/database/schema';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-auth - Test authenticated database connection with RLS
 * This demonstrates how to use the authenticated Drizzle client
 */
export async function GET(request: NextRequest) {
  try {
    // Test the authenticated connection
    const connectionTest = await testAuthenticatedConnection();
    
    if (!connectionTest) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication failed or database connection failed' 
        },
        { status: 401 }
      );
    }

    // Get authenticated Drizzle client
    const db = await getAuthenticatedDrizzleClient();
    
    // Try to query user's own data using RLS
    // RLS will automatically filter results to current user
    const userProfiles = await db
      .select()
      .from(profiles)
      .limit(5);

    const userCount = await db
      .select()
      .from(users)
      .limit(5);

    return NextResponse.json({
      success: true,
      message: 'Authenticated database connection working with RLS',
      data: {
        connectionTest: true,
        profilesFound: userProfiles.length,
        usersFound: userCount.length,
        profiles: userProfiles,
        users: userCount
      }
    });

  } catch (error) {
    console.error('Error in test-auth endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication or database error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}