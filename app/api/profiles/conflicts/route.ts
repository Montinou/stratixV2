import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { z } from 'zod';

const profilesRepository = new ProfilesRepository();

// Validation schema for conflict resolution
const resolveConflictSchema = z.object({
  conflictId: z.string().min(1, 'Conflict ID is required'),
  resolution: z.enum(['keep_stack', 'keep_database', 'merge', 'manual']),
  manualValues: z.object({
    fullName: z.string().optional(),
    roleType: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
    department: z.string().optional(),
    companyId: z.string().optional(),
  }).optional(),
  reason: z.string().max(500).optional(),
});

// Validation schema for batch conflict resolution
const batchResolveSchema = z.object({
  resolutions: z.array(z.object({
    conflictId: z.string().min(1),
    resolution: z.enum(['keep_stack', 'keep_database', 'merge', 'manual']),
    manualValues: z.object({
      fullName: z.string().optional(),
      roleType: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
      department: z.string().optional(),
      companyId: z.string().optional(),
    }).optional(),
  })).min(1, 'At least one resolution is required').max(100, 'Maximum 100 resolutions per batch'),
  reason: z.string().max(500).optional(),
});

interface ProfileConflict {
  id: string;
  userId: string;
  conflictType: 'field_mismatch' | 'role_change' | 'company_change' | 'data_integrity';
  stackData: {
    fullName?: string;
    email?: string;
    lastUpdated: string;
  };
  databaseData: {
    fullName?: string;
    roleType?: string;
    department?: string;
    companyId?: string;
    lastUpdated: string;
  };
  conflictFields: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  autoResolvable: boolean;
  suggestedResolution?: 'keep_stack' | 'keep_database' | 'merge';
}

/**
 * GET /api/profiles/conflicts
 * Get profile synchronization conflicts that need resolution
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
    const userId = searchParams.get('userId');
    const priority = searchParams.get('priority') as 'low' | 'medium' | 'high' | 'critical' | null;
    const conflictType = searchParams.get('conflictType');
    const autoResolvableOnly = searchParams.get('autoResolvableOnly') === 'true';

    // TODO: Get actual conflicts from database
    // For now, return mock conflicts for demonstration
    const mockConflicts: ProfileConflict[] = [
      {
        id: 'conflict_1',
        userId: user.id,
        conflictType: 'field_mismatch',
        stackData: {
          fullName: 'John Smith (Updated)',
          email: user.email || 'john@example.com',
          lastUpdated: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        },
        databaseData: {
          fullName: 'John Smith',
          roleType: 'empleado',
          department: 'Engineering',
          companyId: 'company_1',
          lastUpdated: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        },
        conflictFields: ['fullName'],
        priority: 'medium',
        createdAt: new Date().toISOString(),
        autoResolvable: true,
        suggestedResolution: 'keep_stack', // Stack data is newer
      },
      {
        id: 'conflict_2',
        userId: 'user_2',
        conflictType: 'role_change',
        stackData: {
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          lastUpdated: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        },
        databaseData: {
          fullName: 'Jane Doe',
          roleType: 'gerente',
          department: 'Sales',
          companyId: 'company_1',
          lastUpdated: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        },
        conflictFields: ['roleType'],
        priority: 'high',
        createdAt: new Date().toISOString(),
        autoResolvable: false, // Role changes require manual review
      },
    ];

    // Apply filters
    let filteredConflicts = mockConflicts;

    if (userId) {
      filteredConflicts = filteredConflicts.filter(c => c.userId === userId);
    }

    if (priority) {
      filteredConflicts = filteredConflicts.filter(c => c.priority === priority);
    }

    if (conflictType) {
      filteredConflicts = filteredConflicts.filter(c => c.conflictType === conflictType);
    }

    if (autoResolvableOnly) {
      filteredConflicts = filteredConflicts.filter(c => c.autoResolvable);
    }

    // Sort by priority and creation date
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    filteredConflicts.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      data: {
        conflicts: filteredConflicts,
        summary: {
          total: filteredConflicts.length,
          byPriority: {
            critical: filteredConflicts.filter(c => c.priority === 'critical').length,
            high: filteredConflicts.filter(c => c.priority === 'high').length,
            medium: filteredConflicts.filter(c => c.priority === 'medium').length,
            low: filteredConflicts.filter(c => c.priority === 'low').length,
          },
          byType: {
            field_mismatch: filteredConflicts.filter(c => c.conflictType === 'field_mismatch').length,
            role_change: filteredConflicts.filter(c => c.conflictType === 'role_change').length,
            company_change: filteredConflicts.filter(c => c.conflictType === 'company_change').length,
            data_integrity: filteredConflicts.filter(c => c.conflictType === 'data_integrity').length,
          },
          autoResolvable: filteredConflicts.filter(c => c.autoResolvable).length,
        }
      },
      message: `Retrieved ${filteredConflicts.length} profile conflicts`
    });

  } catch (error) {
    console.error('Error getting profile conflicts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profiles/conflicts
 * Resolve profile synchronization conflicts
 * Supports single and batch conflict resolution
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

    const body = await request.json();

    // Check if this is a batch resolution
    if (body.resolutions && Array.isArray(body.resolutions)) {
      // Batch conflict resolution
      const validation = batchResolveSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid batch resolution data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const { resolutions, reason } = validation.data;
      const results = [];

      for (const resolution of resolutions) {
        try {
          const result = await resolveConflictInternal(
            resolution.conflictId,
            resolution.resolution,
            resolution.manualValues,
            user.id,
            reason
          );

          results.push({
            conflictId: resolution.conflictId,
            success: true,
            result,
          });

        } catch (error) {
          results.push({
            conflictId: resolution.conflictId,
            success: false,
            error: error instanceof Error ? error.message : 'Resolution failed',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return NextResponse.json({
        success: true,
        data: {
          results,
          summary: {
            total: resolutions.length,
            successful: successCount,
            failed: resolutions.length - successCount,
          }
        },
        message: `Batch conflict resolution completed: ${successCount}/${resolutions.length} successful`
      });

    } else {
      // Single conflict resolution
      const validation = resolveConflictSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid conflict resolution data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const { conflictId, resolution, manualValues, reason } = validation.data;

      const result = await resolveConflictInternal(
        conflictId,
        resolution,
        manualValues,
        user.id,
        reason
      );

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Conflict resolved successfully'
      });
    }

  } catch (error) {
    console.error('Error resolving profile conflicts:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profiles/conflicts
 * Auto-resolve conflicts that can be resolved automatically
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

    const body = await request.json();
    const { priority, conflictType, dryRun } = body;

    // TODO: Get auto-resolvable conflicts
    const autoResolvableConflicts = [
      {
        id: 'conflict_1',
        userId: user.id,
        suggestedResolution: 'keep_stack' as const,
      }
    ];

    if (dryRun) {
      // Return what would be auto-resolved without actually resolving
      return NextResponse.json({
        success: true,
        data: {
          conflicts: autoResolvableConflicts,
          summary: {
            total: autoResolvableConflicts.length,
            wouldResolve: autoResolvableConflicts.length,
          }
        },
        message: `Dry run: ${autoResolvableConflicts.length} conflicts would be auto-resolved`
      });
    }

    // Auto-resolve conflicts
    const results = [];
    for (const conflict of autoResolvableConflicts) {
      try {
        const result = await resolveConflictInternal(
          conflict.id,
          conflict.suggestedResolution,
          undefined,
          'system', // Auto-resolution
          'Automatic resolution based on timestamp and priority'
        );

        results.push({
          conflictId: conflict.id,
          success: true,
          result,
        });

      } catch (error) {
        results.push({
          conflictId: conflict.id,
          success: false,
          error: error instanceof Error ? error.message : 'Auto-resolution failed',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          total: autoResolvableConflicts.length,
          resolved: successCount,
          failed: autoResolvableConflicts.length - successCount,
        }
      },
      message: `Auto-resolution completed: ${successCount}/${autoResolvableConflicts.length} conflicts resolved`
    });

  } catch (error) {
    console.error('Error in auto-resolution:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Internal function to resolve a single conflict
 */
async function resolveConflictInternal(
  conflictId: string,
  resolution: 'keep_stack' | 'keep_database' | 'merge' | 'manual',
  manualValues?: any,
  resolvedBy?: string,
  reason?: string
) {
  // TODO: Get actual conflict from database
  // For now, simulate resolution

  console.log('Conflict resolution log:', {
    conflictId,
    resolution,
    manualValues,
    resolvedBy,
    reason,
    timestamp: new Date().toISOString(),
  });

  // Simulate profile update based on resolution
  const resolvedProfile = {
    id: 'profile_id',
    userId: 'user_id',
    fullName: resolution === 'keep_stack' ? 'John Smith (Updated)' : 'John Smith',
    roleType: 'empleado' as const,
    department: 'Engineering',
    companyId: 'company_1',
    updatedAt: new Date(),
    createdAt: new Date(),
  };

  return {
    conflictId,
    resolution,
    resolvedProfile,
    resolvedAt: new Date().toISOString(),
    resolvedBy: resolvedBy || 'unknown',
  };
}