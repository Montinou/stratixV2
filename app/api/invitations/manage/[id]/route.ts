import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import db from '@/db';
import { companyInvitations } from '@/db/okr-schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * DELETE /api/invitations/manage/[id]
 * Cancel/revoke an invitation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get authenticated user
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Get invitation
    const invitation = await db.query.companyInvitations.findFirst({
      where: eq(companyInvitations.id, id),
      with: {
        company: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Verify user has access to the company
    const userProfile = await db.query.profiles.findFirst({
      where: (profiles, { eq, and }) =>
        and(eq(profiles.id, user.id), eq(profiles.companyId, invitation.companyId)),
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'You do not have access to this company' },
        { status: 403 }
      );
    }

    // Only corporate and manager roles can cancel invitations
    if (!['corporativo', 'gerente'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to cancel invitations' },
        { status: 403 }
      );
    }

    // Only pending invitations can be cancelled
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel ${invitation.status} invitation` },
        { status: 400 }
      );
    }

    // Update invitation status to revoked
    await db
      .update(companyInvitations)
      .set({
        status: 'revoked',
        updatedAt: new Date(),
      })
      .where(eq(companyInvitations.id, id));

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);

    return NextResponse.json(
      {
        error: 'Failed to cancel invitation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
