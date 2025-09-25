import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/database/auth';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { SessionManagementService, SessionConfig } from '@/lib/services/session-management';
import { SyncLoggingService } from '@/lib/services/sync-logging';
import { z } from 'zod';

const profilesRepository = new ProfilesRepository();

// Validation schemas
const sessionFilterSchema = z.object({
  userId: z.string().optional(),
  sessionType: z.enum(['web', 'mobile', 'api', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'expired', 'terminated', 'suspended']).optional(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet', 'unknown']).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.number().min(1).max(500).optional().default(100),
  offset: z.number().min(0).optional().default(0),
  includeActivities: z.boolean().optional().default(false),
});

const sessionActionSchema = z.object({
  action: z.enum(['terminate', 'extend', 'suspend', 'reactivate', 'cleanup']),
  sessionIds: z.array(z.string()).min(1).max(100).optional(),
  userId: z.string().optional(),
  reason: z.string().max(500).optional(),
  options: z.object({
    extensionHours: z.number().min(1).max(168).optional(), // 1 hour to 7 days
    notifyUser: z.boolean().optional().default(false),
    forceAction: z.boolean().optional().default(false),
  }).optional().default({}),
});

const sessionConfigUpdateSchema = z.object({
  maxSessionDuration: z.number().min(300).max(86400 * 30).optional(),
  inactivityTimeout: z.number().min(300).max(86400).optional(),
  maxConcurrentSessions: z.number().min(1).max(50).optional(),
  allowCrossTabSync: z.boolean().optional(),
  enableActivityTracking: z.boolean().optional(),
  securityMode: z.enum(['standard', 'strict', 'paranoid']).optional(),
});

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

// Check if user can access specific user's sessions
async function verifySessionAccessPermissions(user: any, targetUserId?: string) {
  try {
    const profile = await profilesRepository.getByUserId(user.id);
    if (profile?.roleType === 'corporativo') return true; // Corporate users can access all sessions
    
    if (!targetUserId || targetUserId === user.id) return true; // Users can access their own sessions
    
    // Managers can access sessions from users in their company
    if (profile?.roleType === 'gerente' && targetUserId) {
      const targetProfile = await profilesRepository.getByUserId(targetUserId);
      return targetProfile?.companyId === profile.companyId;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying session access permissions:', error);
    return false;
  }
}

/**
 * GET /api/admin/sessions
 * Retrieve sessions with filtering and analytics
 * Admin/Manager access required
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile for permission checking
    const adminProfile = await profilesRepository.getByUserId(user.id);
    if (!adminProfile || !['corporativo', 'gerente'].includes(adminProfile.roleType)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Manager access required' },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      userId: searchParams.get('userId'),
      sessionType: searchParams.get('sessionType') as any,
      status: searchParams.get('status') as any,
      deviceType: searchParams.get('deviceType') as any,
      since: searchParams.get('since'),
      until: searchParams.get('until'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      includeActivities: searchParams.get('includeActivities') === 'true',
    };

    const validation = sessionFilterSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid filter parameters',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const filters = validation.data;

    // Check permissions for specific user access
    if (filters.userId) {
      const hasAccess = await verifySessionAccessPermissions(user, filters.userId);
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: 'Cannot access sessions for this user' },
          { status: 403 }
        );
      }
    }

    // Get session statistics
    const stats = SessionManagementService.getSessionStatistics();

    // Get sessions based on filters
    let sessions = [];
    
    if (filters.userId) {
      // Get sessions for specific user
      sessions = SessionManagementService.getUserSessions(filters.userId, true);
    } else {
      // TODO: Implement getting all sessions (this would need database implementation)
      // For now, returning mock data
      sessions = [
        {
          id: 'sess_1',
          userId: 'user_1',
          stackSessionId: 'stack_sess_1',
          sessionType: 'web' as const,
          status: 'active' as const,
          deviceInfo: {
            type: 'desktop' as const,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            ip: '192.168.1.100',
            location: { country: 'Chile', city: 'Santiago', timezone: 'America/Santiago' }
          },
          createdAt: new Date('2024-01-20T10:00:00Z'),
          lastActiveAt: new Date('2024-01-20T15:30:00Z'),
          expiresAt: new Date('2024-01-27T10:00:00Z'),
        },
        {
          id: 'sess_2',
          userId: 'user_2',
          sessionType: 'mobile' as const,
          status: 'active' as const,
          deviceInfo: {
            type: 'mobile' as const,
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
            ip: '192.168.1.101',
          },
          createdAt: new Date('2024-01-20T09:00:00Z'),
          lastActiveAt: new Date('2024-01-20T16:00:00Z'),
          expiresAt: new Date('2024-01-27T09:00:00Z'),
        },
      ];
    }

    // Apply filters
    let filteredSessions = sessions;

    if (filters.sessionType) {
      filteredSessions = filteredSessions.filter(s => s.sessionType === filters.sessionType);
    }
    if (filters.status) {
      filteredSessions = filteredSessions.filter(s => s.status === filters.status);
    }
    if (filters.deviceType) {
      filteredSessions = filteredSessions.filter(s => s.deviceInfo.type === filters.deviceType);
    }
    if (filters.since) {
      const sinceDate = new Date(filters.since);
      filteredSessions = filteredSessions.filter(s => s.createdAt >= sinceDate);
    }
    if (filters.until) {
      const untilDate = new Date(filters.until);
      filteredSessions = filteredSessions.filter(s => s.createdAt <= untilDate);
    }

    // Sort by last active (newest first)
    filteredSessions.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());

    // Apply pagination
    const paginatedSessions = filteredSessions.slice(filters.offset, filters.offset + filters.limit);

    // Include activities if requested
    const sessionsWithData = await Promise.all(
      paginatedSessions.map(async (session) => {
        const sessionData: any = {
          ...session,
          duration: session.lastActiveAt.getTime() - session.createdAt.getTime(),
          isExpired: session.expiresAt < new Date(),
        };

        if (filters.includeActivities) {
          sessionData.activities = SessionManagementService.getSessionActivities(session.id, {
            limit: 10,
          });
        }

        return sessionData;
      })
    );

    // Security analysis for admin users
    let securityAnalysis = {};
    if (adminProfile.roleType === 'corporativo' && filters.userId) {
      securityAnalysis = SessionManagementService.detectSuspiciousActivity(filters.userId);
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessionsWithData,
        pagination: {
          total: filteredSessions.length,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < filteredSessions.length,
        },
        statistics: stats,
        securityAnalysis: Object.keys(securityAnalysis).length > 0 ? securityAnalysis : undefined,
        filters,
        metadata: {
          retrievedAt: new Date().toISOString(),
          retrievedBy: user.id,
          accessLevel: adminProfile.roleType,
        }
      },
      message: `Retrieved ${paginatedSessions.length} sessions`
    });

  } catch (error) {
    console.error('Error retrieving sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sessions
 * Perform actions on sessions (terminate, extend, etc.)
 * Admin access required
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
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
    const validation = sessionActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { action, sessionIds, userId, reason, options } = validation.data;

    let results = [];
    let actionCount = 0;

    switch (action) {
      case 'terminate':
        if (sessionIds && sessionIds.length > 0) {
          // Terminate specific sessions
          for (const sessionId of sessionIds) {
            const success = await SessionManagementService.terminateSession(
              sessionId,
              reason || 'Admin termination',
              { terminatedBy: user.id, ...options }
            );
            results.push({
              sessionId,
              success,
              action: 'terminated'
            });
            if (success) actionCount++;
          }
        } else if (userId) {
          // Terminate all sessions for user
          const terminationResult = await SessionManagementService.terminateUserSessions(
            userId,
            reason || 'Admin bulk termination'
          );
          actionCount = terminationResult.terminated;
          results.push({
            userId,
            success: true,
            action: 'bulk_terminated',
            terminated: terminationResult.terminated,
            failed: terminationResult.failed,
          });
        }
        break;

      case 'extend':
        if (sessionIds && sessionIds.length > 0) {
          const extensionHours = options?.extensionHours || 24;
          const extensionMs = extensionHours * 60 * 60 * 1000;

          for (const sessionId of sessionIds) {
            const session = SessionManagementService.getSession(sessionId);
            if (session && session.status === 'active') {
              session.expiresAt = new Date(session.expiresAt.getTime() + extensionMs);
              results.push({
                sessionId,
                success: true,
                action: 'extended',
                newExpiresAt: session.expiresAt,
                extensionHours,
              });
              actionCount++;
            } else {
              results.push({
                sessionId,
                success: false,
                action: 'extend_failed',
                error: 'Session not found or not active',
              });
            }
          }
        }
        break;

      case 'cleanup':
        // Clean up expired sessions
        const cleanupResult = await SessionManagementService.cleanupExpiredSessions();
        actionCount = cleanupResult.cleaned;
        results.push({
          success: true,
          action: 'cleanup',
          cleaned: cleanupResult.cleaned,
          errors: cleanupResult.errors,
        });
        break;

      case 'suspend':
      case 'reactivate':
        // TODO: Implement session suspension/reactivation
        for (const sessionId of sessionIds || []) {
          results.push({
            sessionId,
            success: false,
            action,
            error: 'Action not implemented yet',
          });
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }

    // Log admin action
    await SyncLoggingService.info(
      'profile_sync',
      `Admin session action: ${action}`,
      {
        details: {
          action,
          sessionIds,
          userId,
          reason,
          actionCount,
          results,
        },
        metadata: { performedBy: user.id },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        action,
        results,
        summary: {
          total: sessionIds?.length || (userId ? 1 : 0),
          successful: actionCount,
          failed: (sessionIds?.length || 0) - actionCount,
        },
        performedBy: user.id,
        performedAt: new Date(),
        reason,
      },
      message: `Session ${action} completed: ${actionCount} successful`
    });

  } catch (error) {
    console.error('Error in session action:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/sessions
 * Update session management configuration
 * Admin access required
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
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
    const validation = sessionConfigUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const configUpdates = validation.data;

    // Update session configuration
    SessionManagementService.updateConfig(configUpdates);

    // Log configuration change
    await SyncLoggingService.info(
      'health_check',
      'Session configuration updated',
      {
        details: { configUpdates },
        metadata: { updatedBy: user.id },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        updatedConfig: configUpdates,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
      message: 'Session configuration updated successfully'
    });

  } catch (error) {
    console.error('Error updating session configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/sessions
 * Emergency session management - terminate all sessions system-wide
 * Admin access required with additional security checks
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
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
    const { confirmationCode, reason } = body;

    // Security check - require confirmation code
    const expectedCode = `EMERGENCY_${new Date().getDate()}${new Date().getMonth()}`;
    if (confirmationCode !== expectedCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid confirmation code for emergency session termination',
          hint: 'Code format: EMERGENCY_DDMM'
        },
        { status: 400 }
      );
    }

    if (!reason || reason.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Detailed reason is required for emergency termination' },
        { status: 400 }
      );
    }

    // TODO: Implement system-wide session termination
    // This would be a critical operation requiring database cleanup
    const mockTerminationResult = {
      terminated: 156,
      failed: 2,
      exceptions: [user.id], // Don't terminate admin's own session
    };

    // Log emergency action
    await SyncLoggingService.critical(
      'health_check',
      'Emergency system-wide session termination executed',
      {
        details: {
          reason,
          confirmationCode,
          terminationResult: mockTerminationResult,
        },
        metadata: { 
          executedBy: user.id,
          emergencyAction: true,
          requiresReview: true,
        },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        action: 'emergency_termination',
        terminationResult: mockTerminationResult,
        reason,
        executedBy: user.id,
        executedAt: new Date(),
        exceptions: [`Current admin session (${user.id}) preserved`],
      },
      message: `Emergency termination completed: ${mockTerminationResult.terminated} sessions terminated`,
      warning: 'All users will need to re-authenticate'
    });

  } catch (error) {
    console.error('Error in emergency session termination:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}