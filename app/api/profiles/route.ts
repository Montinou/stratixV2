import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import type { CreateProfileForm, UserRole } from '@/lib/database/types';
import { z } from 'zod';

const profilesRepository = new ProfilesRepository();

// Validation schema for profile creation
const createProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  roleType: z.enum(['corporativo', 'gerente', 'empleado']),
  department: z.string().min(1, 'Department is required').max(100),
  companyId: z.string().uuid('Invalid company ID format'),
});

// Validation schema for profile updates
const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  roleType: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
  department: z.string().min(1).max(100).optional(),
  companyId: z.string().uuid().optional(),
});

/**
 * GET /api/profiles
 * Get all profiles or filter by query parameters
 * Supports filtering by companyId, roleType, department
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication with Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract query parameters for filtering
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const roleType = searchParams.get('roleType') as UserRole | null;
    const department = searchParams.get('department');

    // Build filters object
    const filters: any = {};
    if (companyId) filters.companyId = companyId;
    if (roleType && ['corporativo', 'gerente', 'empleado'].includes(roleType)) {
      filters.roleType = roleType;
    }
    if (department) filters.department = department;

    // Fetch profiles with filters
    const profiles = await profilesRepository.getAll(filters);

    return NextResponse.json({
      success: true,
      data: profiles,
      message: `Retrieved ${profiles.length} profiles`
    });

  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profiles
 * Create a new profile
 * Requires authentication and valid profile data
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication with Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createProfileSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid profile data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { fullName, roleType, department, companyId } = validation.data;

    // For now, use the authenticated user ID as the profile user ID
    // In a more complete implementation, you might want to allow specifying userId for admin users
    const profileData = {
      userId: user.id,
      fullName,
      roleType,
      department,
      companyId,
    };

    // Create the profile
    const newProfile = await profilesRepository.create(profileData);

    return NextResponse.json({
      success: true,
      data: newProfile,
      message: 'Profile created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating profile:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'Profile already exists for this user' },
          { status: 409 }
        );
      }
      
      if (error.message.includes('foreign key') || error.message.includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Invalid company ID' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profiles
 * Update the current user's profile
 * Updates profile based on authenticated user ID
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication with Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid profile data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    // Update the user's profile
    const updatedProfile = await profilesRepository.update(user.id, validation.data);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json(
        { success: false, error: 'Invalid company ID' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profiles
 * Delete the current user's profile
 * Deletes profile based on authenticated user ID
 */
export async function DELETE() {
  try {
    // Verify authentication with Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete the user's profile
    await profilesRepository.delete(user.id);

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}