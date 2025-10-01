import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredInvitations } from '@/lib/organization/organization-service';

/**
 * GET /api/cron/cleanup-invitations
 *
 * Cron job to mark expired invitations as 'expired'
 * Should be configured to run daily via Vercel Cron Jobs
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-invitations",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization header (Vercel Cron secret)
    const authHeader = request.headers.get('authorization');
    if (
      process.env.NODE_ENV === 'production' &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run cleanup
    const result = await cleanupExpiredInvitations();

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed successfully',
      expiredCount: result.rowCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in cleanup invitations cron job:', error);

    return NextResponse.json(
      {
        error: 'Failed to cleanup invitations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
