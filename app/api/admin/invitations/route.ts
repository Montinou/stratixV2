import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { CompaniesRepository } from '@/lib/database/queries/companies';
import { SyncLoggingService } from '@/lib/services/sync-logging';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const profilesRepository = new ProfilesRepository();
const companiesRepository = new CompaniesRepository();

// Validation schemas
const createInvitationSchema = z.object({
  email: z.string().email('Invalid email format'),
  companyId: z.string().min(1, 'Company ID is required'),
  roleType: z.enum(['corporativo', 'gerente', 'empleado']),
  departmentId: z.string().optional(),
  invitationType: z.enum(['single', 'batch']).optional().default('single'),
  expiresInHours: z.number().min(1).max(168).optional().default(72), // 1 hour to 7 days
  welcomeMessage: z.string().max(500).optional(),
  autoActivate: z.boolean().optional().default(false),
});

const batchInvitationSchema = z.object({
  invitations: z.array(createInvitationSchema).min(1).max(50),
  companyId: z.string().min(1, 'Company ID is required'),
  defaultRole: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
  batchId: z.string().optional(),
  sendImmediately: z.boolean().optional().default(true),
});

const invitationUpdateSchema = z.object({
  status: z.enum(['pending', 'sent', 'accepted', 'expired', 'cancelled']).optional(),
  expiresAt: z.string().datetime().optional(),
  roleType: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
  departmentId: z.string().optional(),
  welcomeMessage: z.string().max(500).optional(),
});

// Invitation interface
interface Invitation {
  id: string;
  email: string;
  companyId: string;
  roleType: 'corporativo' | 'gerente' | 'empleado';
  departmentId?: string;
  invitationCode: string;
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
  createdBy: string;
  welcomeMessage?: string;
  batchId?: string;
  metadata?: Record<string, any>;
}

// In-memory invitation storage (replace with database in production)
const invitations = new Map<string, Invitation>();

// Check if user has admin permissions
async function verifyAdminPermissions(user: any) {
  try {
    const profile = await profilesRepository.getByUserId(user.id);
    return profile?.roleType === 'corporativo';
  } catch (error) {
    console.error('Error verifying admin permissions:', error);
    return false;
  }
}

// Generate secure invitation code
function generateInvitationCode(): string {
  return randomBytes(16).toString('hex');
}

// Check if invitation has expired
function isInvitationExpired(invitation: Invitation): boolean {
  return new Date() > invitation.expiresAt;
}

// Send invitation email (mock implementation)
async function sendInvitationEmail(invitation: Invitation, company: any): Promise<boolean> {
  try {
    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    await SyncLoggingService.info(
      'profile_sync',
      `Invitation email sent to ${invitation.email}`,
      {
        userId: invitation.email,
        companyId: invitation.companyId,
        details: {
          invitationId: invitation.id,
          roleType: invitation.roleType,
          companyName: company.name,
        },
        metadata: { emailProvider: 'mock', sentAt: new Date() },
      }
    );
    
    return true;
  } catch (error) {
    await SyncLoggingService.error(
      'profile_sync',
      `Failed to send invitation email to ${invitation.email}`,
      {
        error,
        details: { invitationId: invitation.id },
      }
    );
    return false;
  }
}

/**
 * POST /api/admin/invitations
 * Create single or batch invitations
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(user);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Determine if it's a batch or single invitation
    if (body.invitations && Array.isArray(body.invitations)) {
      // Batch invitation
      const validation = batchInvitationSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid batch invitation data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const { invitations: invitationData, companyId, defaultRole, sendImmediately } = validation.data;
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Verify company exists
      const company = await companiesRepository.getById(companyId);
      if (!company) {
        return NextResponse.json(
          { success: false, error: 'Company not found' },
          { status: 404 }
        );
      }

      const createdInvitations: Invitation[] = [];
      const failures: any[] = [];

      for (const inviteData of invitationData) {
        try {
          // Use provided role or default role
          const roleType = inviteData.roleType || defaultRole || 'empleado';
          const expiresAt = new Date(Date.now() + (inviteData.expiresInHours || 72) * 60 * 60 * 1000);

          const invitation: Invitation = {
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            email: inviteData.email,
            companyId,
            roleType,
            departmentId: inviteData.departmentId,
            invitationCode: generateInvitationCode(),
            status: 'pending',
            createdAt: new Date(),
            expiresAt,
            createdBy: user.id,
            welcomeMessage: inviteData.welcomeMessage,
            batchId,
          };

          // Store invitation
          invitations.set(invitation.id, invitation);

          // Send email if requested
          if (sendImmediately) {
            const emailSent = await sendInvitationEmail(invitation, company);
            if (emailSent) {
              invitation.status = 'sent';
              invitation.sentAt = new Date();
            }
          }

          createdInvitations.push(invitation);
        } catch (error) {
          failures.push({
            email: inviteData.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Log batch operation
      await SyncLoggingService.info(
        'batch_sync',
        `Batch invitation created: ${createdInvitations.length} invitations`,
        {
          companyId,
          details: {
            batchId,
            successful: createdInvitations.length,
            failed: failures.length,
            totalRequested: invitationData.length,
          },
          metadata: { createdBy: user.id },
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          batchId,
          invitations: createdInvitations.map(inv => ({
            id: inv.id,
            email: inv.email,
            roleType: inv.roleType,
            status: inv.status,
            invitationCode: inv.invitationCode,
            expiresAt: inv.expiresAt,
          })),
          summary: {
            total: invitationData.length,
            successful: createdInvitations.length,
            failed: failures.length,
          },
          failures,
        },
        message: `Batch invitation created: ${createdInvitations.length}/${invitationData.length} successful`
      });

    } else {
      // Single invitation
      const validation = createInvitationSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid invitation data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const { email, companyId, roleType, departmentId, expiresInHours, welcomeMessage } = validation.data;

      // Verify company exists
      const company = await companiesRepository.getById(companyId);
      if (!company) {
        return NextResponse.json(
          { success: false, error: 'Company not found' },
          { status: 404 }
        );
      }

      // Check if invitation already exists for this email and company
      const existingInvitation = Array.from(invitations.values()).find(
        inv => inv.email === email && inv.companyId === companyId && inv.status === 'pending'
      );

      if (existingInvitation && !isInvitationExpired(existingInvitation)) {
        return NextResponse.json(
          { success: false, error: 'Active invitation already exists for this email and company' },
          { status: 409 }
        );
      }

      const expiresAt = new Date(Date.now() + (expiresInHours || 72) * 60 * 60 * 1000);

      const invitation: Invitation = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        companyId,
        roleType,
        departmentId,
        invitationCode: generateInvitationCode(),
        status: 'pending',
        createdAt: new Date(),
        expiresAt,
        createdBy: user.id,
        welcomeMessage,
      };

      // Store invitation
      invitations.set(invitation.id, invitation);

      // Send invitation email
      const emailSent = await sendInvitationEmail(invitation, company);
      if (emailSent) {
        invitation.status = 'sent';
        invitation.sentAt = new Date();
      }

      // Log creation
      await SyncLoggingService.info(
        'profile_sync',
        `Invitation created for ${email}`,
        {
          companyId,
          details: {
            invitationId: invitation.id,
            roleType,
            emailSent,
          },
          metadata: { createdBy: user.id },
        }
      );

      return NextResponse.json({
        success: true,
        data: {
          id: invitation.id,
          email: invitation.email,
          companyId: invitation.companyId,
          companyName: company.name,
          roleType: invitation.roleType,
          status: invitation.status,
          invitationCode: invitation.invitationCode,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
        message: `Invitation created and ${emailSent ? 'sent' : 'queued'} for ${email}`
      });
    }

  } catch (error) {
    console.error('Error creating invitation:', error);
    await SyncLoggingService.error(
      'profile_sync',
      'Failed to create invitation',
      { error, details: { requestBody: await request.json() } }
    );
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/invitations
 * Retrieve invitations with filtering
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(user);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status') as Invitation['status'];
    const email = searchParams.get('email');
    const batchId = searchParams.get('batchId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let filteredInvitations = Array.from(invitations.values());

    // Apply filters
    if (companyId) {
      filteredInvitations = filteredInvitations.filter(inv => inv.companyId === companyId);
    }
    if (status) {
      filteredInvitations = filteredInvitations.filter(inv => inv.status === status);
    }
    if (email) {
      filteredInvitations = filteredInvitations.filter(inv => 
        inv.email.toLowerCase().includes(email.toLowerCase())
      );
    }
    if (batchId) {
      filteredInvitations = filteredInvitations.filter(inv => inv.batchId === batchId);
    }

    // Update expired invitations
    const now = new Date();
    filteredInvitations.forEach(inv => {
      if (inv.status === 'pending' && inv.expiresAt < now) {
        inv.status = 'expired';
      }
    });

    // Sort by creation date (newest first)
    filteredInvitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const paginatedInvitations = filteredInvitations.slice(offset, offset + limit);

    // Get company names for display
    const companyIds = [...new Set(paginatedInvitations.map(inv => inv.companyId))];
    const companies = new Map();
    
    for (const id of companyIds) {
      try {
        const company = await companiesRepository.getById(id);
        if (company) {
          companies.set(id, company);
        }
      } catch (error) {
        console.error(`Error loading company ${id}:`, error);
      }
    }

    // Format response data
    const invitationsWithCompany = paginatedInvitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      companyId: inv.companyId,
      companyName: companies.get(inv.companyId)?.name || 'Unknown Company',
      roleType: inv.roleType,
      departmentId: inv.departmentId,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      sentAt: inv.sentAt,
      acceptedAt: inv.acceptedAt,
      createdBy: inv.createdBy,
      welcomeMessage: inv.welcomeMessage,
      batchId: inv.batchId,
    }));

    // Generate statistics
    const stats = {
      total: filteredInvitations.length,
      pending: filteredInvitations.filter(inv => inv.status === 'pending').length,
      sent: filteredInvitations.filter(inv => inv.status === 'sent').length,
      accepted: filteredInvitations.filter(inv => inv.status === 'accepted').length,
      expired: filteredInvitations.filter(inv => inv.status === 'expired').length,
      cancelled: filteredInvitations.filter(inv => inv.status === 'cancelled').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        invitations: invitationsWithCompany,
        pagination: {
          total: filteredInvitations.length,
          limit,
          offset,
          hasMore: offset + limit < filteredInvitations.length,
        },
        statistics: stats,
        filters: {
          companyId,
          status,
          email,
          batchId,
        },
      },
      message: `Retrieved ${paginatedInvitations.length} invitations`
    });

  } catch (error) {
    console.error('Error retrieving invitations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/invitations
 * Update invitation details
 * Admin only
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(user);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { invitationId, ...updateData } = body;

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Validate update data
    const validation = invitationUpdateSchema.safeParse(updateData);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid update data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const invitation = invitations.get(invitationId);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Update invitation
    const updates = validation.data;
    if (updates.status) invitation.status = updates.status;
    if (updates.expiresAt) invitation.expiresAt = new Date(updates.expiresAt);
    if (updates.roleType) invitation.roleType = updates.roleType;
    if (updates.departmentId) invitation.departmentId = updates.departmentId;
    if (updates.welcomeMessage !== undefined) invitation.welcomeMessage = updates.welcomeMessage;

    // Log update
    await SyncLoggingService.info(
      'profile_sync',
      `Invitation updated: ${invitationId}`,
      {
        details: { invitationId, updates },
        metadata: { updatedBy: user.id },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        companyId: invitation.companyId,
        roleType: invitation.roleType,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
      message: 'Invitation updated successfully'
    });

  } catch (error) {
    console.error('Error updating invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/invitations
 * Cancel invitations
 * Admin only
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await stackServerApp.getUser();
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(user);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { invitationIds, reason } = body;

    if (!invitationIds || !Array.isArray(invitationIds) || invitationIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invitation IDs array is required' },
        { status: 400 }
      );
    }

    const results = [];
    
    for (const invitationId of invitationIds) {
      const invitation = invitations.get(invitationId);
      if (invitation) {
        if (invitation.status === 'pending' || invitation.status === 'sent') {
          invitation.status = 'cancelled';
          invitation.metadata = {
            ...invitation.metadata,
            cancelledBy: user.id,
            cancelledAt: new Date(),
            reason,
          };
          results.push({ invitationId, success: true, action: 'cancelled' });
        } else {
          results.push({ 
            invitationId, 
            success: false, 
            error: `Cannot cancel invitation with status: ${invitation.status}` 
          });
        }
      } else {
        results.push({ invitationId, success: false, error: 'Invitation not found' });
      }
    }

    const successCount = results.filter(r => r.success).length;

    // Log cancellation
    await SyncLoggingService.info(
      'profile_sync',
      `Invitations cancelled: ${successCount}/${invitationIds.length}`,
      {
        details: { invitationIds, reason, results },
        metadata: { cancelledBy: user.id },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: invitationIds.length,
          successful: successCount,
          failed: invitationIds.length - successCount,
        },
        reason,
        cancelledBy: user.id,
        cancelledAt: new Date(),
      },
      message: `Cancelled ${successCount}/${invitationIds.length} invitations`
    });

  } catch (error) {
    console.error('Error cancelling invitations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}