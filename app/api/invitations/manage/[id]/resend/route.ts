import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { sendInvitationEmail, sendReminderEmail } from '@/lib/services/brevo';
import db from '@/db';
import { organizationInvitations } from '@/db/okr-schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PUT /api/invitations/manage/[id]/resend
 * Resend an invitation email
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Parse optional body
    const body = await request.json().catch(() => ({}));
    const isReminder = body.reminder === true;

    // Get authenticated user
    const user = await stackServerApp.getUser({ or: 'redirect' });

    // Get invitation with relationships
    const invitation = await db.query.organizationInvitations.findFirst({
      where: eq(organizationInvitations.id, id),
      with: {
        organization: true,
        inviter: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Verify user has access to the organization
    const userProfile = await db.query.profiles.findFirst({
      where: (profiles, { eq, and }) =>
        and(eq(profiles.id, user.id), eq(profiles.companyId, invitation.organizationId)),
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Only corporate and manager roles can resend invitations
    if (!['corporativo', 'gerente'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to resend invitations' },
        { status: 403 }
      );
    }

    // Only pending invitations can be resent
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot resend ${invitation.status} invitation` },
        { status: 400 }
      );
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired. Please create a new one.' },
        { status: 400 }
      );
    }

    // Calculate days remaining
    const daysRemaining = Math.ceil(
      (invitation.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send appropriate email (reminder or resend)
    if (isReminder && daysRemaining > 0) {
      await sendReminderEmail({
        to: invitation.email,
        organizationName: invitation.organization.name,
        organizationSlug: invitation.organization.slug,
        role: invitation.role,
        inviterName: invitation.inviter.email || 'Team member',
        inviterEmail: invitation.inviter.email || '',
        invitationToken: invitation.token,
        expiresAt: invitation.expiresAt,
        daysRemaining,
      });
    } else {
      await sendInvitationEmail({
        to: invitation.email,
        organizationName: invitation.organization.name,
        organizationSlug: invitation.organization.slug,
        role: invitation.role,
        inviterName: invitation.inviter.email || 'Team member',
        inviterEmail: invitation.inviter.email || '',
        invitationToken: invitation.token,
        expiresAt: invitation.expiresAt,
      });
    }

    // Update invitation timestamp
    await db
      .update(organizationInvitations)
      .set({ updatedAt: new Date() })
      .where(eq(organizationInvitations.id, id));

    return NextResponse.json({
      success: true,
      message: isReminder ? 'Reminder sent successfully' : 'Invitation resent successfully',
    });
  } catch (error) {
    console.error('Error resending invitation:', error);

    return NextResponse.json(
      {
        error: 'Failed to resend invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
