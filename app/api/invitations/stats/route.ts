import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import db from '@/db';
import { organizationInvitations } from '@/db/okr-schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * GET /api/invitations/stats
 * Get invitation statistics for an organization
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser({ or: 'redirect' });

    // Get organization ID from query params
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    // Get user's organization if not specified
    let targetOrgId = organizationId;
    if (!targetOrgId) {
      const userProfile = await db.query.profiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.id, user.id),
      });

      if (!userProfile || !userProfile.companyId) {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
      }

      targetOrgId = userProfile.companyId;
    }

    // Verify user has access to the organization
    const userProfile = await db.query.profiles.findFirst({
      where: (profiles, { eq, and }) =>
        and(eq(profiles.id, user.id), eq(profiles.companyId, targetOrgId!)),
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Get overall stats
    const [totalStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where status = 'pending')::int`,
        accepted: sql<number>`count(*) filter (where status = 'accepted')::int`,
        expired: sql<number>`count(*) filter (where status = 'expired')::int`,
        revoked: sql<number>`count(*) filter (where status = 'revoked')::int`,
      })
      .from(organizationInvitations)
      .where(eq(organizationInvitations.organizationId, targetOrgId));

    // Get recent invitations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        pending: sql<number>`count(*) filter (where status = 'pending')::int`,
        accepted: sql<number>`count(*) filter (where status = 'accepted')::int`,
      })
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, targetOrgId),
          sql`${organizationInvitations.createdAt} >= ${sevenDaysAgo}`
        )
      );

    // Get expiring soon (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const [{ expiringSoon }] = await db
      .select({
        expiringSoon: sql<number>`count(*)::int`,
      })
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, targetOrgId),
          eq(organizationInvitations.status, 'pending'),
          sql`${organizationInvitations.expiresAt} <= ${threeDaysFromNow}`,
          sql`${organizationInvitations.expiresAt} > now()`
        )
      );

    // Calculate acceptance rate
    const acceptanceRate =
      totalStats.total > 0
        ? Math.round((totalStats.accepted / (totalStats.accepted + totalStats.expired + totalStats.revoked)) * 100)
        : 0;

    // Get invitation breakdown by role
    const roleBreakdown = await db
      .select({
        role: organizationInvitations.role,
        count: sql<number>`count(*)::int`,
      })
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, targetOrgId),
          eq(organizationInvitations.status, 'pending')
        )
      )
      .groupBy(organizationInvitations.role);

    return NextResponse.json({
      overall: {
        total: totalStats.total,
        pending: totalStats.pending,
        accepted: totalStats.accepted,
        expired: totalStats.expired,
        revoked: totalStats.revoked,
        acceptanceRate,
      },
      recent: {
        last7Days: recentStats.total,
        pendingLast7Days: recentStats.pending,
        acceptedLast7Days: recentStats.accepted,
      },
      alerts: {
        expiringSoon,
      },
      breakdown: {
        byRole: roleBreakdown.map((item) => ({
          role: item.role,
          count: item.count,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting invitation stats:', error);

    return NextResponse.json(
      {
        error: 'Failed to get invitation stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
