import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/database/auth';
import { UsersRepository } from '@/lib/database/queries/users';
import { z } from 'zod';

const usersRepository = new UsersRepository();

// Validation schema for user updates
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  passwordHash: z.string().optional(),
  emailConfirmed: z.boolean().optional(),
});

/**
 * GET /api/users/[id]
 * Get a specific user by ID
 * Includes profile and company information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Validate ID format (basic UUID check)
    if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // For security, only allow users to view their own details unless admin
    // In a complete implementation, you'd check for admin role
    if (user.id !== id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Can only view your own user details' },
        { status: 403 }
      );
    }

    // Fetch user with profile and company information
    const userWithProfile = await usersRepository.getByIdWithProfile(id);

    if (!userWithProfile) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove sensitive information from response
    const { passwordHash, ...safeUser } = userWithProfile;

    return NextResponse.json({
      success: true,
      data: safeUser,
      message: 'User retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id]
 * Update a specific user
 * Users can only update their own details unless admin
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // For security, only allow users to update their own details
    if (user.id !== id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Can only update your own user details' },
        { status: 403 }
      );
    }

    // Check if user exists
    const existingUser = await usersRepository.getById(id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid user data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    // Check for email uniqueness if email is being updated
    if (validation.data.email && validation.data.email !== existingUser.email) {
      const userWithSameEmail = await usersRepository.getByEmail(validation.data.email);
      if (userWithSameEmail && userWithSameEmail.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (validation.data.email !== undefined) updateData.email = validation.data.email;
    if (validation.data.passwordHash !== undefined) updateData.passwordHash = validation.data.passwordHash;
    if (validation.data.emailConfirmed !== undefined) {
      updateData.emailConfirmed = validation.data.emailConfirmed ? new Date() : null;
    }

    // Update the user
    const updatedUser = await usersRepository.update(id, updateData);

    // Remove sensitive information from response
    const { passwordHash, ...safeUser } = updatedUser;

    return NextResponse.json({
      success: true,
      data: safeUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a specific user
 * Users can only delete their own account unless admin
 * Warning: This will cascade delete profile and related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // For security, only allow users to delete their own account
    if (user.id !== id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Can only delete your own account' },
        { status: 403 }
      );
    }

    // Check if user exists
    const existingUser = await usersRepository.getById(id);
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete the user (this will cascade delete the profile)
    await usersRepository.delete(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete user: user has associated data that must be removed first' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}