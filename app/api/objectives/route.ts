import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ObjectivesRepository, type FilterParams } from '@/lib/database/queries/objectives';

/**
 * GET /api/objectives - Get all objectives with role-based filtering
 * 
 * Query parameters:
 * - userId: string (required) - Current user ID
 * - userRole: string (required) - User role (empleado, gerente, corporativo)
 * - userDepartment: string (required) - User department
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication with Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userDepartment = searchParams.get('userDepartment');

    // Validate required parameters
    if (!userId || !userRole || !userDepartment) {
      return NextResponse.json(
        { error: 'Missing required parameters: userId, userRole, userDepartment' },
        { status: 400 }
      );
    }

    // Validate userRole
    if (!['empleado', 'gerente', 'corporativo'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Invalid userRole. Must be one of: empleado, gerente, corporativo' },
        { status: 400 }
      );
    }

    const filterParams: FilterParams = {
      userId,
      userRole,
      userDepartment,
    };

    const objectives = await ObjectivesRepository.getAll(filterParams);
    
    return NextResponse.json({ data: objectives }, { status: 200 });
  } catch (error) {
    console.error('Error fetching objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching objectives' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objectives - Create a new objective
 * 
 * Body parameters:
 * - title: string (required)
 * - description?: string 
 * - department: string (required)
 * - status: 'draft' | 'in_progress' | 'completed' | 'cancelled' (required)
 * - priority: 'low' | 'medium' | 'high' (required)
 * - start_date: string (required) - ISO date string
 * - end_date: string (required) - ISO date string
 * - owner_id: string (required)
 * - company_id: string (required)
 * - progress?: number (0-100)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication with Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'department', 'status', 'priority', 'start_date', 'end_date', 'owner_id', 'company_id'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate enums
    if (!['draft', 'in_progress', 'completed', 'cancelled'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: draft, in_progress, completed, cancelled' },
        { status: 400 }
      );
    }

    if (!['low', 'medium', 'high'].includes(body.priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be one of: low, medium, high' },
        { status: 400 }
      );
    }

    // Validate progress if provided
    if (body.progress !== undefined && (body.progress < 0 || body.progress > 100)) {
      return NextResponse.json(
        { error: 'Progress must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const objective = await ObjectivesRepository.create({
      title: body.title,
      description: body.description,
      department: body.department,
      status: body.status,
      priority: body.priority,
      start_date: body.start_date,
      end_date: body.end_date,
      owner_id: body.owner_id,
      company_id: body.company_id,
      progress: body.progress,
    });

    return NextResponse.json({ data: objective }, { status: 201 });
  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating objective' },
      { status: 500 }
    );
  }
}