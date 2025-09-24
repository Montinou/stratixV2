import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/database/auth';
import { UsersRepository } from '@/lib/database/queries/users';
import { z } from 'zod';

const usersRepository = new UsersRepository();

// Validation schema for user creation
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  passwordHash: z.string().optional(),
  emailConfirmed: z.boolean().optional(),
});

// Validation schema for user updates
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  passwordHash: z.string().optional(),
  emailConfirmed: z.boolean().optional(),
});

/**
 * GET /api/users
 * Get all users with optional pagination and search
 * Admin function - requires proper authorization
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search'); // Search by email
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    let users;
    
    if (search) {
      // Search users by email
      users = await usersRepository.searchByEmail(search, limit);
    } else {
      // Get all users with pagination
      users = await usersRepository.getAll(limit, offset);
    }

    // Get total count for pagination info
    const totalCount = await usersRepository.getCount();
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
      message: `Retrieved ${users.length} users`
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create a new user
 * Admin function or used for Stack Auth integration
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createUserSchema.safeParse(body);
    
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

    const { email, passwordHash, emailConfirmed } = validation.data;

    // Check if user with same email already exists
    const existingUser = await usersRepository.getByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create the user
    const newUser = await usersRepository.create({
      email,
      passwordHash: passwordHash || null,
      emailConfirmed: emailConfirmed ? new Date() : null,
    });

    // Remove sensitive information from response
    const { passwordHash: _, ...safeUser } = newUser;

    return NextResponse.json({
      success: true,
      data: safeUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}