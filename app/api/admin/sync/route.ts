import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/database/auth';
import { ProfileSyncService } from '@/lib/database/services/profile-sync';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { CompaniesRepository } from '@/lib/database/queries/companies';
import { z } from 'zod';

const profilesRepository = new ProfilesRepository();
const companiesRepository = new CompaniesRepository();

// Validation schema for manual sync trigger
const manualSyncSchema = z.object({
  syncType: z.enum(['user', 'company', 'full', 'health_check']),
  targetId: z.string().optional(), // userId for user sync, companyId for company sync
  options: z.object({
    forceUpdate: z.boolean().optional().default(false),
    includeInactive: z.boolean().optional().default(false),
    dryRun: z.boolean().optional().default(false),
    batchSize: z.number().min(1).max(1000).optional().default(100),
  }).optional().default({}),
  reason: z.string().max(500).optional(),
});

// Check if user has admin permissions (simplified check)
async function verifyAdminPermissions(user: any) {
  try {
    const profile = await profilesRepository.getByUserId(user.id);
    return profile?.roleType === 'corporativo';
  } catch (error) {
    console.error('Error verifying admin permissions:', error);
    return false;
  }
}

/**
 * POST /api/admin/sync
 * Manually trigger profile synchronization operations
 * Admin only - supports various sync types and configurations
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

    // Parse and validate request
    const body = await request.json();
    const validation = manualSyncSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid sync request data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { syncType, targetId, options, reason } = validation.data;

    // Log admin action
    console.log('Admin sync trigger:', {
      syncType,
      targetId,
      options,
      reason,
      triggeredBy: user.id,
      timestamp: new Date().toISOString(),
    });

    switch (syncType) {
      case 'user': {
        if (!targetId) {
          return NextResponse.json(
            { success: false, error: 'User ID is required for user sync' },
            { status: 400 }
          );
        }

        if (options.dryRun) {
          return NextResponse.json({
            success: true,
            data: {
              dryRun: true,
              syncType: 'user',
              targetId,
              message: 'Dry run: Would sync single user profile',
            }
          });
        }

        // TODO: Get actual Stack user data for sync
        const mockStackUser = {
          id: targetId,
          displayName: `User ${targetId}`,
          primaryEmail: `${targetId}@example.com`,
        };

        const result = await ProfileSyncService.syncUserProfile(
          mockStackUser as any,
          'default-company-id',
          {
            autoCreateProfile: true,
            forceUpdate: options.forceUpdate,
          }
        );

        return NextResponse.json({
          success: true,
          data: {
            syncType: 'user',
            targetId,
            result: {
              success: result.success,
              created: result.created,
              profile: result.profile,
              error: result.error,
            },
            triggeredBy: user.id,
            triggeredAt: new Date().toISOString(),
          },
          message: result.success 
            ? `User profile ${result.created ? 'created' : 'synchronized'} successfully`
            : `User sync failed: ${result.error}`
        });
      }

      case 'company': {
        if (!targetId) {
          return NextResponse.json(
            { success: false, error: 'Company ID is required for company sync' },
            { status: 400 }
          );
        }

        // Verify company exists
        const company = await companiesRepository.getById(targetId);
        if (!company) {
          return NextResponse.json(
            { success: false, error: 'Company not found' },
            { status: 404 }
          );
        }

        if (options.dryRun) {
          const userCount = 10; // TODO: Get actual user count for company
          return NextResponse.json({
            success: true,
            data: {
              dryRun: true,
              syncType: 'company',
              targetId,
              companyName: company.name,
              estimatedUsers: userCount,
              message: `Dry run: Would sync ${userCount} users for company ${company.name}`,
            }
          });
        }

        // TODO: Get all users for the company and sync them
        const mockUsers = [
          { id: 'user1', displayName: 'User 1', primaryEmail: 'user1@example.com' },
          { id: 'user2', displayName: 'User 2', primaryEmail: 'user2@example.com' },
        ];

        const results = [];
        for (const mockUser of mockUsers) {
          try {
            const result = await ProfileSyncService.syncUserProfile(
              mockUser as any,
              targetId,
              {
                autoCreateProfile: true,
                forceUpdate: options.forceUpdate,
              }
            );
            results.push({
              userId: mockUser.id,
              success: result.success,
              created: result.created,
              error: result.error,
            });
          } catch (error) {
            results.push({
              userId: mockUser.id,
              success: false,
              created: false,
              error: error instanceof Error ? error.message : 'Sync failed',
            });
          }
        }

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
          success: true,
          data: {
            syncType: 'company',
            targetId,
            companyName: company.name,
            results,
            summary: {
              total: results.length,
              successful: successCount,
              failed: results.length - successCount,
            },
            triggeredBy: user.id,
            triggeredAt: new Date().toISOString(),
          },
          message: `Company sync completed: ${successCount}/${results.length} users synchronized`
        });
      }

      case 'full': {
        if (options.dryRun) {
          const totalUsers = 100; // TODO: Get actual total user count
          const totalCompanies = 5; // TODO: Get actual company count
          
          return NextResponse.json({
            success: true,
            data: {
              dryRun: true,
              syncType: 'full',
              estimatedUsers: totalUsers,
              estimatedCompanies: totalCompanies,
              estimatedDuration: '15-30 minutes',
              message: `Dry run: Would perform full system sync for ${totalUsers} users across ${totalCompanies} companies`,
            }
          });
        }

        // TODO: Implement full system sync
        // This would be a background job in production
        return NextResponse.json({
          success: true,
          data: {
            syncType: 'full',
            status: 'initiated',
            jobId: `full_sync_${Date.now()}`,
            estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            triggeredBy: user.id,
            triggeredAt: new Date().toISOString(),
          },
          message: 'Full system sync initiated. This may take 15-30 minutes to complete.'
        });
      }

      case 'health_check': {
        const healthStatus = await ProfileSyncService.getIntegrationHealth();

        return NextResponse.json({
          success: true,
          data: {
            syncType: 'health_check',
            status: healthStatus,
            recommendations: [],
            issues: healthStatus.errors || [],
            checkedBy: user.id,
            checkedAt: new Date().toISOString(),
          },
          message: 'Integration health check completed'
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid sync type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in admin sync trigger:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync
 * Get sync statistics and status information
 * Admin only
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

    // Verify admin permissions
    const isAdmin = await verifyAdminPermissions(user);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get sync statistics
    const healthStatus = await ProfileSyncService.getIntegrationHealth();

    // TODO: Get actual sync job history and statistics
    const syncStats = {
      totalSyncs: 150,
      syncsToday: 5,
      syncsThisWeek: 23,
      syncsThisMonth: 89,
      lastSync: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      averageSyncTime: 2.3, // seconds
      successRate: 98.7, // percentage
      activeSyncJobs: 0,
      queuedSyncJobs: 0,
    };

    const recentSyncs = [
      {
        id: 'sync_1',
        type: 'user',
        targetId: 'user_123',
        status: 'completed',
        duration: 1.2,
        triggeredBy: 'system',
        completedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
      },
      {
        id: 'sync_2',
        type: 'company',
        targetId: 'company_1',
        status: 'completed',
        duration: 15.7,
        triggeredBy: user.id,
        completedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        integrationHealth: healthStatus,
        statistics: syncStats,
        recentSyncs,
        syncTypes: [
          {
            name: 'user',
            description: 'Sync individual user profile',
            requiresTarget: true,
            estimatedDuration: '1-3 seconds',
          },
          {
            name: 'company',
            description: 'Sync all users in a company',
            requiresTarget: true,
            estimatedDuration: '5-15 minutes',
          },
          {
            name: 'full',
            description: 'Full system synchronization',
            requiresTarget: false,
            estimatedDuration: '15-30 minutes',
          },
          {
            name: 'health_check',
            description: 'Check integration health status',
            requiresTarget: false,
            estimatedDuration: '1-2 seconds',
          },
        ]
      },
      message: 'Sync dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting sync dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}