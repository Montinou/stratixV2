import { NextRequest, NextResponse } from 'next/server';
import { InitiativesRepository } from '@/lib/database/queries/initiatives';

/**
 * GET /api/initiatives/[id]/progress - Get initiative progress calculation
 * 
 * Path parameters:
 * - id: string (required) - Initiative ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const initiativesRepo = new InitiativesRepository();

    // Check if initiative exists
    const initiative = await initiativesRepo.getById(id);
    if (!initiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    const calculatedProgress = await initiativesRepo.calculateProgress(id);

    return NextResponse.json({ 
      data: { 
        initiative_id: id,
        calculated_progress: calculatedProgress,
        current_progress: initiative.progress || 0
      } 
    }, { status: 200 });
  } catch (error) {
    console.error('Error calculating initiative progress:', error);
    return NextResponse.json(
      { error: 'Internal server error while calculating progress' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/initiatives/[id]/progress - Update initiative progress based on activities
 * 
 * Path parameters:
 * - id: string (required) - Initiative ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const initiativesRepo = new InitiativesRepository();

    // Check if initiative exists
    const initiative = await initiativesRepo.getById(id);
    if (!initiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    const updatedInitiative = await initiativesRepo.updateProgressFromActivities(id);

    return NextResponse.json({ data: updatedInitiative }, { status: 200 });
  } catch (error) {
    console.error('Error updating initiative progress:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating progress' },
      { status: 500 }
    );
  }
}