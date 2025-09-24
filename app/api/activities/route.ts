import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesRepository, type FilterParams } from '@/lib/database/queries/activities';

/**
 * GET /api/activities - Get all activities with role-based filtering
 * 
 * Query parameters:
 * - userId: string (required) - Current user ID
 * - userRole: string (required) - User role (empleado, gerente, corporativo)
 * - userDepartment: string (required) - User department
 * - initiativeId?: string (optional) - Filter by specific initiative
 * - assigneeId?: string (optional) - Filter by assignee
 * - status?: string (optional) - Filter by status
 * - priority?: string (optional) - Filter by priority
 * - overdue?: boolean (optional) - Show only overdue activities
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('userRole');
    const userDepartment = searchParams.get('userDepartment');
    const initiativeId = searchParams.get('initiativeId');
    const assigneeId = searchParams.get('assigneeId');
    const status = searchParams.get('status') as any;
    const priority = searchParams.get('priority') as any;
    const overdue = searchParams.get('overdue') === 'true';

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

    // Validate status filter
    if (status && !['todo', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: todo, in_progress, completed, cancelled' },
        { status: 400 }
      );
    }

    // Validate priority filter
    if (priority && !['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be one of: low, medium, high' },
        { status: 400 }
      );
    }

    let activities;

    // Handle specific filters first
    if (overdue) {
      activities = await ActivitiesRepository.getOverdue();
    } else if (initiativeId) {
      activities = await ActivitiesRepository.getByInitiativeId(initiativeId);
    } else if (assigneeId) {
      activities = await ActivitiesRepository.getByAssigneeId(assigneeId);
    } else if (status) {
      activities = await ActivitiesRepository.getByStatus(status);
    } else if (priority) {
      activities = await ActivitiesRepository.getByPriority(priority);
    } else {
      // Get all activities with role-based filtering
      const filterParams: FilterParams = {
        userId,
        userRole,
        userDepartment,
      };
      activities = await ActivitiesRepository.getAll(filterParams);
    }
    
    return NextResponse.json({ data: activities }, { status: 200 });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities - Create a new activity
 * 
 * Body parameters:
 * - initiative_id: string (required)
 * - title: string (required)
 * - description?: string 
 * - status: 'todo' | 'in_progress' | 'completed' | 'cancelled' (required)
 * - priority: 'low' | 'medium' | 'high' (required)
 * - due_date: string (required) - ISO date string
 * - assigned_to: string (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['initiative_id', 'title', 'status', 'priority', 'due_date', 'assigned_to'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate enums
    if (!['todo', 'in_progress', 'completed', 'cancelled'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: todo, in_progress, completed, cancelled' },
        { status: 400 }
      );
    }

    if (!['low', 'medium', 'high'].includes(body.priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be one of: low, medium, high' },
        { status: 400 }
      );
    }

    // Validate due date
    const dueDate = new Date(body.due_date);
    if (isNaN(dueDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid due_date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const activity = await ActivitiesRepository.create({
      initiative_id: body.initiative_id,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      due_date: body.due_date,
      assigned_to: body.assigned_to,
    });

    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating activity' },
      { status: 500 }
    );
  }
}