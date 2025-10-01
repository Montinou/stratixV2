import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stackServerApp } from '@/stack/server';
import { createInvitation } from '@/lib/organization/organization-service';
import { sendInvitationEmail } from '@/lib/services/brevo';
import db from '@/db';
import { organizationInvitations } from '@/db/okr-schema';
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
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
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

    // Verify user has access to the organization
    const userProfile = await db.query.profiles.findFirst({
      where: (profiles, { eq, and }) =>
        and(eq(profiles.id, user.id), eq(profiles.companyId, organizationId)),
      with: {
        company: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    // Only corporate and manager roles can send invitations
    if (!['corporativo', 'gerente'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to send invitations' },
        { status: 403 }
      );
    }

    // Create invitations and send emails
    const results = await Promise.allSettled(
      emails.map(async (email) => {
        try {
          // Create invitation in database
          const invitation = await createInvitation({
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
      message: `${sent} invitation(s) sent successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      results: detailedResults,
      stats: { sent, failed, total: emails.length },
    });
  } catch (error) {
    console.error('Error sending invitations:', error);

    return NextResponse.json(
      {
        error: 'Failed to send invitations',
        details: error instanceof Error ? error.message : 'Unknown error',
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
      organizationId: searchParams.get('organizationId'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { organizationId, status, search, page, limit } = validation.data;

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
    console.error('Error listing invitations:', error);

    return NextResponse.json(
      {
        error: 'Failed to list invitations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
