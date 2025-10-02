import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { sendInvitationEmail, sendReminderEmail } from '@/lib/services/brevo';
import { withRLSContext } from '@/lib/database/rls-client';
import { companyInvitations } from '@/db/okr-schema';
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

    // Get invitation with relationships using RLS
    const invitation = await withRLSContext(user.id, async (db) => {
      return await db.query.companyInvitations.findFirst({
        where: eq(companyInvitations.id, id),
        with: {
          company: true,
          inviter: true,
        },
      });
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    }

    // Verify user has access to the company using RLS
    const userProfile = await withRLSContext(user.id, async (db) => {
      return await db.query.profiles.findFirst({
        where: (profiles, { eq, and }) =>
          and(eq(profiles.id, user.id), eq(profiles.companyId, invitation.companyId)),
      });
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta compañía' },
        { status: 403 }
      );
    }

    // Only corporate and manager roles can resend invitations
    if (!['corporativo', 'gerente'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'No tienes permiso para reenviar invitaciones' },
        { status: 403 }
      );
    }

    // Only pending invitations can be resent
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: `No se puede reenviar una invitación con estado: ${invitation.status}` },
        { status: 400 }
      );
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'La invitación ha expirado. Por favor, crea una nueva.' },
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
        organizationName: invitation.company.name,
        organizationSlug: invitation.company.slug,
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
        organizationName: invitation.company.name,
        organizationSlug: invitation.company.slug,
        role: invitation.role,
        inviterName: invitation.inviter.email || 'Team member',
        inviterEmail: invitation.inviter.email || '',
        invitationToken: invitation.token,
        expiresAt: invitation.expiresAt,
      });
    }

    // Update invitation timestamp using RLS
    await withRLSContext(user.id, async (db) => {
      return await db
        .update(companyInvitations)
        .set({ updatedAt: new Date() })
        .where(eq(companyInvitations.id, id));
    });

    return NextResponse.json({
      success: true,
      message: isReminder ? 'Recordatorio enviado exitosamente' : 'Invitación reenviada exitosamente',
    });
  } catch (error) {
    console.error('Error al reenviar invitación:', error);

    return NextResponse.json(
      {
        error: 'Error al reenviar la invitación',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
