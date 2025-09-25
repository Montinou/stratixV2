import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfileSyncService } from '@/lib/database/services/profile-sync';
import { z } from 'zod';

// Validation schema for manual sync request
const manualSyncSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  forceUpdate: z.boolean().optional().default(false),
  companyId: z.string().optional(),
});

// Validation schema for batch sync
const batchSyncSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required').max(100, 'Maximum 100 users per batch'),
  companyId: z.string().min(1, 'Company ID is required'),
  forceUpdate: z.boolean().optional().default(false),
});

/**
 * POST /api/profiles/sync
 * Manually trigger profile synchronization for a user or batch of users
 * Supports both single user sync and batch operations
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

    // Parse request body
    const body = await request.json();

    // Check if this is a batch sync or single sync
    if (Array.isArray(body.userIds)) {
      // Batch sync
      const validation = batchSyncSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid batch sync data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const { userIds, companyId, forceUpdate } = validation.data;

      // For now, simulate batch sync by processing individually
      // In production, this would use optimized batch operations
      const results = [];
      
      for (const userId of userIds) {
        try {
          // TODO: Get actual Stack user data for sync
          // For now, we'll use a placeholder approach
          const stackUser = {
            id: userId,
            displayName: `User ${userId}`,
            primaryEmail: `${userId}@example.com`,
          };

          const result = await ProfileSyncService.syncUserProfile(
            stackUser as any,
            companyId,
            { 
              autoCreateProfile: true,
              forceUpdate 
            }
          );

          results.push({
            userId,
            success: result.success,
            created: result.created,
            profile: result.profile,
            error: result.error
          });

        } catch (error) {
          results.push({
            userId,
            success: false,
            created: false,
            profile: null,
            error: error instanceof Error ? error.message : 'Sync failed'
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      
      return NextResponse.json({
        success: true,
        data: {
          results,
          summary: {
            total: userIds.length,
            successful: successCount,
            failed: userIds.length - successCount,
          }
        },
        message: `Batch sync completed: ${successCount}/${userIds.length} successful`
      });

    } else {
      // Single user sync
      const validation = manualSyncSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid sync data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const { userId, forceUpdate, companyId } = validation.data;

      // Check authorization - users can only sync their own profile unless admin
      if (user.id !== userId) {
        // TODO: Check if user has admin permissions
        // For now, only allow self-sync
        return NextResponse.json(
          { success: false, error: 'Can only sync your own profile' },
          { status: 403 }
        );
      }

      // TODO: Get actual Stack user data for the userId
      // For now, use the authenticated user data
      const stackUser = {
        id: userId,
        displayName: user.email || `User ${userId}`,
        primaryEmail: user.email || `${userId}@example.com`,
      };

      const defaultCompanyId = companyId || 'default-company-id';

      const result = await ProfileSyncService.syncUserProfile(
        stackUser as any,
        defaultCompanyId,
        { 
          autoCreateProfile: true,
          forceUpdate 
        }
      );

      if (result.success) {
        return NextResponse.json({
          success: true,
          data: {
            profile: result.profile,
            created: result.created,
            updated: !result.created,
          },
          message: result.created ? 'Profile created successfully' : 'Profile synchronized successfully'
        });
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: result.error || 'Profile synchronization failed'
          },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('Error in profile sync:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profiles/sync
 * Get sync status and statistics
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

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    // Get integration health status
    const healthStatus = await ProfileSyncService.getIntegrationHealth(companyId || undefined);

    return NextResponse.json({
      success: true,
      data: {
        status: 'active',
        stackConnected: healthStatus.stackConnected,
        databaseConnected: healthStatus.databaseConnected,
        lastSyncTimestamp: healthStatus.lastSyncTimestamp,
        pendingSyncs: healthStatus.pendingSyncs,
        errors: healthStatus.errors,
        profileStats: healthStatus.profileStats,
        syncConfig: {
          autoCreateProfile: true,
          defaultRole: 'empleado',
          defaultDepartment: 'General',
        }
      },
      message: 'Sync status retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}