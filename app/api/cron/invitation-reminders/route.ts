import { NextRequest, NextResponse } from 'next/server';
import db from '@/db';
import { companyInvitations } from '@/db/okr-schema';
import { and, eq, sql } from 'drizzle-orm';
import { sendReminderEmail } from '@/lib/services/brevo';

/**
 * GET /api/cron/invitation-reminders
 *
 * Cron job to send reminder emails for pending invitations
 * Should be configured to run daily via Vercel Cron Jobs
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/invitation-reminders",
 *     "schedule": "0 10 * * *"
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

    const now = new Date();
    const results = {
      threeDayReminders: 0,
      sevenDayReminders: 0,
      errors: 0,
    };

    // Calculate date ranges
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysFromNowEnd = new Date(threeDaysFromNow);
    threeDaysFromNowEnd.setHours(23, 59, 59, 999);

    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowEnd = new Date(sevenDaysFromNow);
    sevenDaysFromNowEnd.setHours(23, 59, 59, 999);

    // Get invitations expiring in 3 days
    const threeDayInvitations = await db.query.companyInvitations.findMany({
      where: and(
        eq(companyInvitations.status, 'pending'),
        sql`${companyInvitations.expiresAt} >= ${threeDaysFromNow}`,
        sql`${companyInvitations.expiresAt} <= ${threeDaysFromNowEnd}`
      ),
      with: {
        company: true,
        inviter: true,
      },
    });

    // Get invitations expiring in 7 days (first reminder)
    const sevenDayInvitations = await db.query.companyInvitations.findMany({
      where: and(
        eq(companyInvitations.status, 'pending'),
        sql`${companyInvitations.expiresAt} >= ${sevenDaysFromNow}`,
        sql`${companyInvitations.expiresAt} <= ${sevenDaysFromNowEnd}`
      ),
      with: {
        company: true,
        inviter: true,
      },
    });

    // Send 3-day reminders
    for (const invitation of threeDayInvitations) {
      try {
        await sendReminderEmail({
          to: invitation.email,
          organizationName: invitation.company.name,
          organizationSlug: invitation.company.slug,
          role: invitation.role,
          inviterName: invitation.inviter.email || 'Team member',
          inviterEmail: invitation.inviter.email || '',
          invitationToken: invitation.token,
          expiresAt: invitation.expiresAt,
          daysRemaining: 3,
        });

        results.threeDayReminders++;
      } catch (error) {
        console.error(`Failed to send 3-day reminder to ${invitation.email}:`, error);
        results.errors++;
      }
    }

    // Send 7-day reminders
    for (const invitation of sevenDayInvitations) {
      try {
        await sendReminderEmail({
          to: invitation.email,
          organizationName: invitation.company.name,
          organizationSlug: invitation.company.slug,
          role: invitation.role,
          inviterName: invitation.inviter.email || 'Team member',
          inviterEmail: invitation.inviter.email || '',
          invitationToken: invitation.token,
          expiresAt: invitation.expiresAt,
          daysRemaining: 7,
        });

        results.sevenDayReminders++;
      } catch (error) {
        console.error(`Failed to send 7-day reminder to ${invitation.email}:`, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Reminders sent successfully',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in invitation reminders cron job:', error);

    return NextResponse.json(
      {
        error: 'Failed to process reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
