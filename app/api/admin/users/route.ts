import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { CompaniesRepository } from '@/lib/database/queries/companies';
import { SyncLoggingService } from '@/lib/services/sync-logging';
import { z } from 'zod';

const profilesRepository = new ProfilesRepository();
const companiesRepository = new CompaniesRepository();

// Validation schemas
const batchUserActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete', 'update_role', 'transfer_company', 'reset_password']),
  userIds: z.array(z.string()).min(1).max(100),
  options: z.object({
    newRole: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
    newCompanyId: z.string().optional(),
    reason: z.string().max(500).optional(),
    notifyUsers: z.boolean().optional().default(false),
    forceAction: z.boolean().optional().default(false),
  }).optional().default({}),
});

const userFilterSchema = z.object({
  companyId: z.string().optional(),
  roleType: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
  status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
  departmentId: z.string().optional(),
  search: z.string().optional(), // Search in name, email
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  lastActiveAfter: z.string().datetime().optional(),
  lastActiveBefore: z.string().datetime().optional(),
  limit: z.number().min(1).max(1000).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(['name', 'email', 'createdAt', 'lastActive', 'company']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const userUpdateSchema = z.object({
  userId: z.string().min(1),
  updates: z.object({
    displayName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    roleType: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
    companyId: z.string().optional(),
    departmentId: z.string().optional(),
    status: z.enum(['active', 'inactive', 'pending', 'suspended']).optional(),
    metadata: z.record(z.any()).optional(),
  }),
  reason: z.string().max(500).optional(),
  notifyUser: z.boolean().optional().default(false),
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

// Check if user has permissions for company operations
async function verifyCompanyPermissions(user: any, targetCompanyId: string) {
  try {
    const profile = await profilesRepository.getByUserId(user.id);
    if (profile?.roleType === 'corporativo') return true; // Corporate users can access all companies
    return profile?.companyId === targetCompanyId; // Users can only manage their own company
  } catch (error) {
    console.error('Error verifying company permissions:', error);
    return false;
  }
}

// Validate role hierarchy for updates
function canAssignRole(adminRole: string, targetRole: string): boolean {
  const roleHierarchy = {
    corporativo: ['corporativo', 'gerente', 'empleado'],
    gerente: ['empleado'],
    empleado: []
  };
  
  return roleHierarchy[adminRole as keyof typeof roleHierarchy]?.includes(targetRole) || false;
}

// Send user notification (mock implementation)
async function notifyUser(userId: string, action: string, details: any): Promise<boolean> {
  try {
    // TODO: Integrate with notification service
    await SyncLoggingService.info(
      'profile_sync',
      `User notification sent: ${action}`,
      {
        userId,
        details: { action, ...details },
        metadata: { notificationProvider: 'mock', sentAt: new Date() },
      }
    );
    return true;
  } catch (error) {
    await SyncLoggingService.error(
      'profile_sync',
      `Failed to send user notification: ${action}`,
      { error, userId, details }
    );
    return false;
  }
}

/**
 * GET /api/admin/users
 * Retrieve users with advanced filtering and search
 * Admin/Manager access required
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
      companyId: searchParams.get('companyId'),
      roleType: searchParams.get('roleType') as any,
      status: searchParams.get('status') as any,
      departmentId: searchParams.get('departmentId'),
      search: searchParams.get('search'),
      createdAfter: searchParams.get('createdAfter'),
      createdBefore: searchParams.get('createdBefore'),
      lastActiveAfter: searchParams.get('lastActiveAfter'),
      lastActiveBefore: searchParams.get('lastActiveBefore'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sortBy: searchParams.get('sortBy') as any || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
    };

    const validation = userFilterSchema.safeParse(queryParams);
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

    // Apply company restrictions for non-corporate users
    if (adminProfile.roleType === 'gerente' && !filters.companyId) {
      filters.companyId = adminProfile.companyId;
    } else if (adminProfile.roleType === 'gerente' && filters.companyId !== adminProfile.companyId) {
      return NextResponse.json(
        { success: false, error: 'Cannot access users from other companies' },
        { status: 403 }
      );
    }

    // TODO: Implement actual database query with filters
    // For now, using mock data structure
    const mockUsers = [
      {
        id: 'user_1',
        stackId: 'stack_user_1',
        email: 'john.doe@company1.com',
        displayName: 'John Doe',
        roleType: 'gerente',
        companyId: 'company_1',
        departmentId: 'dept_1',
        status: 'active',
        createdAt: new Date('2024-01-15'),
        lastActive: new Date('2024-01-20'),
        metadata: { source: 'invitation' }
      },
      {
        id: 'user_2',
        stackId: 'stack_user_2',
        email: 'jane.smith@company1.com',
        displayName: 'Jane Smith',
        roleType: 'empleado',
        companyId: 'company_1',
        departmentId: 'dept_2',
        status: 'active',
        createdAt: new Date('2024-01-10'),
        lastActive: new Date('2024-01-19'),
        metadata: { source: 'direct_signup' }
      },
    ];

    // Apply filters to mock data
    let filteredUsers = mockUsers;

    if (filters.companyId) {
      filteredUsers = filteredUsers.filter(u => u.companyId === filters.companyId);
    }
    if (filters.roleType) {
      filteredUsers = filteredUsers.filter(u => u.roleType === filters.roleType);
    }
    if (filters.status) {
      filteredUsers = filteredUsers.filter(u => u.status === filters.status);
    }
    if (filters.departmentId) {
      filteredUsers = filteredUsers.filter(u => u.departmentId === filters.departmentId);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.displayName.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filters
    if (filters.createdAfter) {
      const afterDate = new Date(filters.createdAfter);
      filteredUsers = filteredUsers.filter(u => u.createdAt >= afterDate);
    }
    if (filters.createdBefore) {
      const beforeDate = new Date(filters.createdBefore);
      filteredUsers = filteredUsers.filter(u => u.createdAt <= beforeDate);
    }

    // Sort users
    filteredUsers.sort((a, b) => {
      const aVal = a[filters.sortBy as keyof typeof a];
      const bVal = b[filters.sortBy as keyof typeof b];
      
      if (aVal < bVal) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const paginatedUsers = filteredUsers.slice(filters.offset, filters.offset + filters.limit);

    // Get company information for display
    const companyIds = [...new Set(paginatedUsers.map(u => u.companyId))];
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

    // Format response with company names
    const usersWithCompany = paginatedUsers.map(user => ({
      ...user,
      companyName: companies.get(user.companyId)?.name || 'Unknown Company',
    }));

    // Generate statistics
    const stats = {
      total: filteredUsers.length,
      active: filteredUsers.filter(u => u.status === 'active').length,
      inactive: filteredUsers.filter(u => u.status === 'inactive').length,
      pending: filteredUsers.filter(u => u.status === 'pending').length,
      suspended: filteredUsers.filter(u => u.status === 'suspended').length,
      roleBreakdown: {
        corporativo: filteredUsers.filter(u => u.roleType === 'corporativo').length,
        gerente: filteredUsers.filter(u => u.roleType === 'gerente').length,
        empleado: filteredUsers.filter(u => u.roleType === 'empleado').length,
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithCompany,
        pagination: {
          total: filteredUsers.length,
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + filters.limit < filteredUsers.length,
        },
        statistics: stats,
        filters,
        metadata: {
          retrievedAt: new Date().toISOString(),
          retrievedBy: user.id,
          accessLevel: adminProfile.roleType,
        }
      },
      message: `Retrieved ${paginatedUsers.length} users`
    });

  } catch (error) {
    console.error('Error retrieving users:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Perform batch operations on users
 * Admin access required
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
    const adminProfile = await profilesRepository.getByUserId(user.id);
    if (!adminProfile || adminProfile.roleType !== 'corporativo') {
      return NextResponse.json(
        { success: false, error: 'Corporate admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = batchUserActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid batch action data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { action, userIds, options } = validation.data;
    const results = [];

    // Validate role assignments if needed
    if (action === 'update_role' && options?.newRole) {
      if (!canAssignRole(adminProfile.roleType, options.newRole)) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions to assign this role' },
          { status: 403 }
        );
      }
    }

    // Process each user
    for (const userId of userIds) {
      try {
        // TODO: Get actual user profile from database
        const mockUserProfile = {
          id: userId,
          stackId: `stack_${userId}`,
          email: `user${userId}@example.com`,
          displayName: `User ${userId}`,
          roleType: 'empleado' as const,
          companyId: 'company_1',
          status: 'active' as const,
        };

        let actionResult = { success: false, message: '', data: {} };

        switch (action) {
          case 'activate':
            // TODO: Implement user activation
            mockUserProfile.status = 'active';
            actionResult = { 
              success: true, 
              message: 'User activated', 
              data: { previousStatus: 'inactive', newStatus: 'active' }
            };
            break;

          case 'deactivate':
            // TODO: Implement user deactivation
            mockUserProfile.status = 'inactive';
            actionResult = { 
              success: true, 
              message: 'User deactivated', 
              data: { previousStatus: 'active', newStatus: 'inactive' }
            };
            break;

          case 'delete':
            // TODO: Implement user deletion (soft delete)
            if (!options?.forceAction) {
              actionResult = { 
                success: false, 
                message: 'User deletion requires forceAction flag', 
                data: {} 
              };
            } else {
              actionResult = { 
                success: true, 
                message: 'User deleted', 
                data: { deletedAt: new Date() }
              };
            }
            break;

          case 'update_role':
            if (!options?.newRole) {
              actionResult = { 
                success: false, 
                message: 'New role is required for role update', 
                data: {} 
              };
            } else {
              // TODO: Implement role update
              const previousRole = mockUserProfile.roleType;
              mockUserProfile.roleType = options.newRole;
              actionResult = { 
                success: true, 
                message: 'Role updated', 
                data: { previousRole, newRole: options.newRole }
              };
            }
            break;

          case 'transfer_company':
            if (!options?.newCompanyId) {
              actionResult = { 
                success: false, 
                message: 'New company ID is required for transfer', 
                data: {} 
              };
            } else {
              // Verify target company exists
              const targetCompany = await companiesRepository.getById(options.newCompanyId);
              if (!targetCompany) {
                actionResult = { 
                  success: false, 
                  message: 'Target company not found', 
                  data: {} 
                };
              } else {
                // TODO: Implement company transfer
                const previousCompanyId = mockUserProfile.companyId;
                mockUserProfile.companyId = options.newCompanyId;
                actionResult = { 
                  success: true, 
                  message: 'User transferred', 
                  data: { 
                    previousCompanyId, 
                    newCompanyId: options.newCompanyId,
                    targetCompanyName: targetCompany.name
                  }
                };
              }
            }
            break;

          case 'reset_password':
            // TODO: Implement password reset trigger
            actionResult = { 
              success: true, 
              message: 'Password reset initiated', 
              data: { 
                resetSent: true, 
                resetMethod: 'email',
                resetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
              }
            };
            break;

          default:
            actionResult = { 
              success: false, 
              message: 'Unknown action', 
              data: {} 
            };
        }

        // Send notification if requested and action was successful
        if (actionResult.success && options?.notifyUsers) {
          await notifyUser(userId, action, {
            reason: options.reason,
            performedBy: user.id,
            ...actionResult.data
          });
        }

        results.push({
          userId,
          success: actionResult.success,
          action,
          message: actionResult.message,
          data: actionResult.data,
        });

      } catch (error) {
        results.push({
          userId,
          success: false,
          action,
          message: error instanceof Error ? error.message : 'Unknown error',
          data: {},
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    // Log batch operation
    await SyncLoggingService.info(
      'batch_sync',
      `Batch user action: ${action}`,
      {
        details: {
          action,
          userCount: userIds.length,
          successful: successCount,
          failed: userIds.length - successCount,
          options,
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
          total: userIds.length,
          successful: successCount,
          failed: userIds.length - successCount,
        },
        options,
        performedBy: user.id,
        performedAt: new Date(),
      },
      message: `Batch ${action} completed: ${successCount}/${userIds.length} successful`
    });

  } catch (error) {
    console.error('Error in batch user operation:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users
 * Update individual user details
 * Admin access required
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

    // Get admin profile
    const adminProfile = await profilesRepository.getByUserId(user.id);
    if (!adminProfile || !['corporativo', 'gerente'].includes(adminProfile.roleType)) {
      return NextResponse.json(
        { success: false, error: 'Admin or Manager access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = userUpdateSchema.safeParse(body);

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

    const { userId, updates, reason, notifyUser: shouldNotify } = validation.data;

    // TODO: Get target user profile from database
    const targetUser = {
      id: userId,
      stackId: `stack_${userId}`,
      email: `user${userId}@example.com`,
      displayName: `User ${userId}`,
      roleType: 'empleado' as const,
      companyId: 'company_1',
      status: 'active' as const,
    };

    // Verify company permissions
    if (adminProfile.roleType === 'gerente') {
      const hasPermission = await verifyCompanyPermissions(user, targetUser.companyId);
      if (!hasPermission) {
        return NextResponse.json(
          { success: false, error: 'Cannot update users from other companies' },
          { status: 403 }
        );
      }
    }

    // Validate role assignment permissions
    if (updates.roleType && !canAssignRole(adminProfile.roleType, updates.roleType)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to assign this role' },
        { status: 403 }
      );
    }

    // Validate company transfer permissions
    if (updates.companyId && updates.companyId !== targetUser.companyId) {
      if (adminProfile.roleType !== 'corporativo') {
        return NextResponse.json(
          { success: false, error: 'Only corporate admins can transfer users between companies' },
          { status: 403 }
        );
      }

      // Verify target company exists
      const targetCompany = await companiesRepository.getById(updates.companyId);
      if (!targetCompany) {
        return NextResponse.json(
          { success: false, error: 'Target company not found' },
          { status: 404 }
        );
      }
    }

    // TODO: Apply updates to database
    const updatedFields = [];
    const previousValues: any = {};

    if (updates.displayName && updates.displayName !== targetUser.displayName) {
      previousValues.displayName = targetUser.displayName;
      targetUser.displayName = updates.displayName;
      updatedFields.push('displayName');
    }

    if (updates.email && updates.email !== targetUser.email) {
      previousValues.email = targetUser.email;
      targetUser.email = updates.email;
      updatedFields.push('email');
    }

    if (updates.roleType && updates.roleType !== targetUser.roleType) {
      previousValues.roleType = targetUser.roleType;
      targetUser.roleType = updates.roleType;
      updatedFields.push('roleType');
    }

    if (updates.companyId && updates.companyId !== targetUser.companyId) {
      previousValues.companyId = targetUser.companyId;
      targetUser.companyId = updates.companyId;
      updatedFields.push('companyId');
    }

    if (updates.status && updates.status !== targetUser.status) {
      previousValues.status = targetUser.status;
      targetUser.status = updates.status;
      updatedFields.push('status');
    }

    // Send notification if requested
    if (shouldNotify && updatedFields.length > 0) {
      await notifyUser(userId, 'profile_update', {
        updatedFields,
        reason,
        performedBy: user.id,
      });
    }

    // Log update
    await SyncLoggingService.info(
      'profile_sync',
      `User profile updated: ${userId}`,
      {
        userId,
        details: {
          updatedFields,
          previousValues,
          newValues: updates,
          reason,
        },
        metadata: { updatedBy: user.id },
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        userId,
        updatedFields,
        previousValues,
        newValues: updates,
        updatedUser: targetUser,
        updatedBy: user.id,
        updatedAt: new Date(),
        reason,
      },
      message: `User updated: ${updatedFields.length} fields changed`
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}