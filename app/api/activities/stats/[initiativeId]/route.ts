import { NextRequest, NextResponse } from 'next/server';
import { ActivitiesRepository } from '@/lib/database/queries/activities';

/**
 * GET /api/activities/stats/[initiativeId] - Get activity completion statistics for an initiative
 * 
 * Path parameters:
 * - initiativeId: string (required) - Initiative ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { initiativeId: string } }
) {
  try {
    const { initiativeId } = params;

    const stats = await ActivitiesRepository.getCompletionStats(initiativeId);

    return NextResponse.json({ data: stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching activity statistics' },
      { status: 500 }
    );
  }
}