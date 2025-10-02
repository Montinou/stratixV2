import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stackServerApp } from '@/stack/server';
import { createInvitation } from '@/lib/organization/organization-service';
import { sendInvitationEmail } from '@/lib/services/brevo';
import { withRLSContext } from '@/lib/database/rls-client';
import { organizationInvitations, profiles } from '@/db/okr-schema';
import { and, eq, desc, sql, or, like } from 'drizzle-orm';

// Validation schemas
const sendInvitationSchema = z.object({
  emails: z
    .array(z.string().email('Invalid email address'))
    .min(1, 'At least one email is required')
    .max(50, 'Maximum 50 emails per batch'),
  role: z.enum(['corporativo', 'gerente', 'empleado']),
  organizationId: z.string().uuid('Invalid organization ID'),
});

const listInvitationsSchema = z.object({
  organizationId: z.string().uuid().optional(),
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

/**
 * POST /api/invitations
 * Send invitations to one or more emails
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser({ or: 'redirect' });

    // Parse and validate request body
    const body = await request.json();
    const validation = sendInvitationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { emails, role, organizationId } = validation.data;

    // Verify user has access to the organization (with RLS)
    const userProfile = await withRLSContext(user.id, async (db) => {
      return await db.query.profiles.findFirst({
        where: and(
          eq(profiles.id, user.id),
          eq(profiles.companyId, organizationId)
        ),
        with: {
          company: true,
        },
      });
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta organización' },
        { status: 403 }
      );
    }

    // Only corporate and manager roles can send invitations
    if (!['corporativo', 'gerente'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para enviar invitaciones' },
        { status: 403 }
      );
    }

    // Create invitations and send emails
    const results = await Promise.allSettled(
      emails.map(async (email) => {
        try {
          // Create invitation in database
          const invitation = await createInvitation(user.id, {
            email,
            role,
            organizationId,
            invitedBy: user.id,
          });

          // Send invitation email via Brevo
          await sendInvitationEmail({
            to: email,
            organizationName: userProfile.company?.name || 'Organization',
            organizationSlug: userProfile.company?.slug || 'org',
            role,
            inviterName: user.displayName || user.primaryEmail || 'Team member',
            inviterEmail: user.primaryEmail || '',
            invitationToken: invitation.token,
            expiresAt: invitation.expiresAt,
          });

          return {
            email,
            status: 'sent',
            invitationId: invitation.id,
          };
        } catch (error) {
          console.error(`Failed to send invitation to ${email}:`, error);
          return {
            email,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Process results
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value.status === 'sent').length;
    const failed = results.filter((r) => r.status === 'rejected' || r.value.status === 'failed').length;

    const detailedResults = results.map((r) => {
      if (r.status === 'fulfilled') {
        return r.value;
      } else {
        return {
          email: 'unknown',
          status: 'failed',
          error: r.reason?.message || 'Unknown error',
        };
      }
    });

    return NextResponse.json({
      success: true,
      message: `${sent} invitación(es) enviada(s) exitosamente${failed > 0 ? `, ${failed} fallaron` : ''}`,
      results: detailedResults,
      stats: { sent, failed, total: emails.length },
    });
  } catch (error) {
    console.error('Error al enviar invitaciones:', error);

    return NextResponse.json(
      {
        error: 'Error al enviar invitaciones',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invitations
 * List invitations for an organization with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await stackServerApp.getUser({ or: 'redirect' });

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const validation = listInvitationsSchema.safeParse({
      organizationId: searchParams.get('organizationId') || undefined,
      status: searchParams.get('status') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { organizationId, status, search, page, limit } = validation.data;

    // Get user's organization if not specified and all data (with RLS)
    const result = await withRLSContext(user.id, async (db) => {
      // Get user's organization if not specified
      let targetOrgId = organizationId;
      if (!targetOrgId) {
        const userProfile = await db.query.profiles.findFirst({
          where: eq(profiles.id, user.id),
        });

        if (!userProfile || !userProfile.companyId) {
          return { error: 'Perfil de usuario no encontrado' };
        }

        targetOrgId = userProfile.companyId;
      }

      // Verify user has access to the organization
      const userProfile = await db.query.profiles.findFirst({
        where: and(
          eq(profiles.id, user.id),
          eq(profiles.companyId, targetOrgId!)
        ),
      });

      if (!userProfile) {
        return { error: 'No tienes acceso a esta organización' };
      }

      // Build query conditions
      const conditions = [eq(organizationInvitations.organizationId, targetOrgId)];

      if (status) {
        conditions.push(eq(organizationInvitations.status, status));
      }

      if (search) {
        conditions.push(like(organizationInvitations.email, `%${search}%`));
      }

      // Count total invitations
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationInvitations)
        .where(and(...conditions));

      // Get paginated invitations
      const offset = (page - 1) * limit;
      const invitations = await db.query.organizationInvitations.findMany({
        where: and(...conditions),
        orderBy: desc(organizationInvitations.createdAt),
        limit,
        offset,
        with: {
          organization: {
            columns: {
              id: true,
              name: true,
              slug: true,
            },
          },
          inviter: {
            columns: {
              id: true,
              email: true,
            },
          },
        },
      });

      return { count, invitations };
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes('no encontrado') ? 404 : 403 }
      );
    }

    const { count, invitations } = result;

    const totalPages = Math.ceil(count / limit);

    return NextResponse.json({
      invitations,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('Error al listar invitaciones:', error);

    return NextResponse.json(
      {
        error: 'Error al listar invitaciones',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
