import { NextRequest, NextResponse } from 'next/server';
import { ObjectivesRepository } from '@/lib/database/queries/objectives';

/**
 * GET /api/objectives/[id] - Get objective by ID
 * 
 * Path parameters:
 * - id: string (required) - Objective ID
 * 
 * Query parameters:
 * - userId: string (required) - Current user ID (for access control)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const objective = await ObjectivesRepository.getById(id, userId);

    if (!objective) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: objective }, { status: 200 });
  } catch (error) {
    console.error('Error fetching objective:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching objective' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/objectives/[id] - Update objective by ID
 * 
 * Path parameters:
 * - id: string (required) - Objective ID
 * 
 * Body parameters (all optional):
 * - title?: string
 * - description?: string 
 * - department?: string
 * - status?: 'draft' | 'in_progress' | 'completed' | 'cancelled'
 * - priority?: 'low' | 'medium' | 'high'
 * - start_date?: string - ISO date string
 * - end_date?: string - ISO date string
 * - owner_id?: string
 * - company_id?: string
 * - progress?: number (0-100)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if objective exists
    const exists = await ObjectivesRepository.exists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (body.status && !['draft', 'in_progress', 'completed', 'cancelled'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: draft, in_progress, completed, cancelled' },
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

    // Validate progress if provided
    if (body.progress !== undefined && (body.progress < 0 || body.progress > 100)) {
      return NextResponse.json(
        { error: 'Progress must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Validate dates if provided
    if (body.start_date && isNaN(new Date(body.start_date).getTime())) {
      return NextResponse.json(
        { error: 'Invalid start_date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (body.end_date && isNaN(new Date(body.end_date).getTime())) {
      return NextResponse.json(
        { error: 'Invalid end_date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validate date relationship if both are provided
    if (body.start_date && body.end_date) {
      const startDate = new Date(body.start_date);
      const endDate = new Date(body.end_date);
      
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    const updatedObjective = await ObjectivesRepository.update(id, body);

    return NextResponse.json({ data: updatedObjective }, { status: 200 });
  } catch (error) {
    console.error('Error updating objective:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating objective' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/objectives/[id] - Delete objective by ID
 * 
 * Path parameters:
 * - id: string (required) - Objective ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if objective exists
    const exists = await ObjectivesRepository.exists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      );
    }

    await ObjectivesRepository.delete(id);

    return NextResponse.json({ message: 'Objective deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting objective:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting objective' },
      { status: 500 }
    );
  }
}