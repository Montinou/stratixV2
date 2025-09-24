import { NextRequest, NextResponse } from 'next/server';
import { InitiativesRepository } from '@/lib/database/queries/initiatives';

/**
 * GET /api/initiatives/[id] - Get initiative by ID
 * 
 * Path parameters:
 * - id: string (required) - Initiative ID
 * 
 * Query parameters:
 * - includeActivities?: boolean (optional) - Include related activities
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeActivities = searchParams.get('includeActivities') === 'true';

    const initiativesRepo = new InitiativesRepository();

    let initiative;
    if (includeActivities) {
      initiative = await initiativesRepo.getWithActivities(id);
    } else {
      initiative = await initiativesRepo.getById(id);
    }

    if (!initiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: initiative }, { status: 200 });
  } catch (error) {
    console.error('Error fetching initiative:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching initiative' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/initiatives/[id] - Update initiative by ID
 * 
 * Path parameters:
 * - id: string (required) - Initiative ID
 * 
 * Body parameters (all optional):
 * - objective_id?: string
 * - title?: string
 * - description?: string 
 * - status?: 'planning' | 'in_progress' | 'completed' | 'cancelled'
 * - priority?: 'low' | 'medium' | 'high'
 * - start_date?: string - ISO date string
 * - end_date?: string - ISO date string
 * - owner_id?: string
 * - progress?: number (0-100)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const initiativesRepo = new InitiativesRepository();

    // Check if initiative exists
    const exists = await initiativesRepo.getById(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (body.status && !['planning', 'in_progress', 'completed', 'cancelled'].includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: planning, in_progress, completed, cancelled' },
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

    const updatedInitiative = await initiativesRepo.update(id, body);

    return NextResponse.json({ data: updatedInitiative }, { status: 200 });
  } catch (error) {
    console.error('Error updating initiative:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating initiative' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/initiatives/[id] - Delete initiative by ID
 * 
 * Path parameters:
 * - id: string (required) - Initiative ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const initiativesRepo = new InitiativesRepository();

    // Check if initiative exists
    const exists = await initiativesRepo.getById(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    await initiativesRepo.delete(id);

    return NextResponse.json({ message: 'Initiative deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting initiative:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting initiative' },
      { status: 500 }
    );
  }
}