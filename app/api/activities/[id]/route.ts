import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesRepository } from '@/lib/database/queries/activities';

/**
 * GET /api/activities/[id] - Get activity by ID
 * 
 * Path parameters:
 * - id: string (required) - Activity ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const activity = await ActivitiesRepository.getById(id);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: activity }, { status: 200 });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching activity' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/activities/[id] - Update activity by ID
 * 
 * Path parameters:
 * - id: string (required) - Activity ID
 * 
 * Body parameters (all optional):
 * - initiative_id?: string
 * - title?: string
 * - description?: string 
 * - status?: 'todo' | 'in_progress' | 'completed' | 'cancelled'
 * - priority?: 'low' | 'medium' | 'high'
 * - due_date?: string - ISO date string
 * - assigned_to?: string
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if activity exists
    const exists = await ActivitiesRepository.exists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (body.status && !['todo', 'in_progress', 'completed', 'cancelled'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: todo, in_progress, completed, cancelled' },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (body.priority && !['low', 'medium', 'high'].includes(body.priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be one of: low, medium, high' },
        { status: 400 }
      );
    }

    // Validate due_date if provided
    if (body.due_date && isNaN(new Date(body.due_date).getTime())) {
      return NextResponse.json(
        { error: 'Invalid due_date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const updatedActivity = await ActivitiesRepository.update(id, body);

    return NextResponse.json({ data: updatedActivity }, { status: 200 });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating activity' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id] - Delete activity by ID
 * 
 * Path parameters:
 * - id: string (required) - Activity ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if activity exists
    const exists = await ActivitiesRepository.exists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    await ActivitiesRepository.delete(id);

    return NextResponse.json({ message: 'Activity deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting activity' },
      { status: 500 }
    );
  }
}