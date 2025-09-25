import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfilesRepository } from '@/lib/database/queries/profiles';

const profilesRepository = new ProfilesRepository();

/**
 * GET /api/profiles/[userId]
 * Get a specific user's profile by user ID
 * Includes company and user information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // Validate userId format (basic UUID check)
    if (!userId || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Fetch profile by user ID
    const profile = await profilesRepository.getByUserId(userId);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching profile by user ID:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profiles/[userId]
 * Update a specific user's profile (admin function)
 * Only allow if current user has appropriate permissions
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // For security, only allow users to update their own profile for now
    // In a more complete implementation, you'd check for admin role
    if (user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Can only update your own profile' },
        { status: 403 }
      );
    }

    // Validate userId format
    if (!userId || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Basic validation - could be enhanced with Zod schema
    const allowedFields = ['fullName', 'roleType', 'department', 'companyId'];
    const updates: any = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update the profile
    const updatedProfile = await profilesRepository.update(userId, updates);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile by user ID:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profiles/[userId]
 * Delete a specific user's profile (admin function)
 * Only allow if current user has appropriate permissions
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = params;

    // For security, only allow users to delete their own profile for now
    // In a more complete implementation, you'd check for admin role
    if (user.id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Can only delete your own profile' },
        { status: 403 }
      );
    }

    // Validate userId format
    if (!userId || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Delete the profile
    await profilesRepository.delete(userId);

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting profile by user ID:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}