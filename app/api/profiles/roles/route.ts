import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/database/auth';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { z } from 'zod';

const profilesRepository = new ProfilesRepository();

// Validation schema for role assignment
const assignRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleType: z.enum(['corporativo', 'gerente', 'empleado']),
  department: z.string().min(1, 'Department is required').max(100),
  effectiveDate: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
  notifyUser: z.boolean().optional().default(true),
});

// Validation schema for bulk role assignment
const bulkAssignRoleSchema = z.object({
  assignments: z.array(z.object({
    userId: z.string().min(1),
    roleType: z.enum(['corporativo', 'gerente', 'empleado']),
    department: z.string().min(1).max(100),
    reason: z.string().max(500).optional(),
  })).min(1, 'At least one assignment is required').max(50, 'Maximum 50 assignments per batch'),
  effectiveDate: z.string().datetime().optional(),
  notifyUsers: z.boolean().optional().default(true),
});

// Role permissions mapping
const ROLE_PERMISSIONS = {
  corporativo: [
    'view_all_data',
    'manage_users',
    'manage_companies',
    'manage_roles',
    'view_analytics',
    'manage_settings',
    'delete_data',
    'export_data',
  ],
  gerente: [
    'view_team_data',
    'manage_team_members',
    'view_team_analytics',
    'assign_objectives',
    'manage_initiatives',
    'view_reports',
  ],
  empleado: [
    'view_own_data',
    'update_own_profile',
    'view_assigned_objectives',
    'update_progress',
    'view_team_objectives',
  ],
} as const;

/**
 * POST /api/profiles/roles
 * Assign roles to users with department and permission integration
 * Supports single and bulk role assignments
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

    const body = await request.json();

    // Check if this is a bulk assignment
    if (body.assignments && Array.isArray(body.assignments)) {
      // Bulk role assignment
      const validation = bulkAssignRoleSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid bulk role assignment data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const { assignments, effectiveDate, notifyUsers } = validation.data;

      // TODO: Check if user has permission to assign roles
      // For now, we'll allow authenticated users to assign roles

      const results = [];
      const effectiveTimestamp = effectiveDate ? new Date(effectiveDate) : new Date();

      for (const assignment of assignments) {
        try {
          const { userId, roleType, department, reason } = assignment;

          // Get current profile
          const currentProfile = await profilesRepository.getByUserId(userId);
          if (!currentProfile) {
            results.push({
              userId,
              success: false,
              error: 'User profile not found',
            });
            continue;
          }

          // Update role and department
          const updatedProfile = await profilesRepository.update(userId, {
            roleType,
            department,
            updatedAt: effectiveTimestamp,
          });

          // Log role change
          console.log('Role assignment log:', {
            userId,
            previousRole: currentProfile.roleType,
            newRole: roleType,
            previousDepartment: currentProfile.department,
            newDepartment: department,
            reason,
            assignedBy: user.id,
            effectiveDate: effectiveTimestamp.toISOString(),
          });

          results.push({
            userId,
            success: true,
            profile: updatedProfile,
            permissions: ROLE_PERMISSIONS[roleType],
            changes: {
              roleChanged: currentProfile.roleType !== roleType,
              departmentChanged: currentProfile.department !== department,
            },
          });

          // TODO: Send notification if notifyUsers is true
          if (notifyUsers) {
            console.log(`Would notify user ${userId} about role change to ${roleType}`);
          }

        } catch (error) {
          results.push({
            userId: assignment.userId,
            success: false,
            error: error instanceof Error ? error.message : 'Role assignment failed',
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return NextResponse.json({
        success: true,
        data: {
          results,
          summary: {
            total: assignments.length,
            successful: successCount,
            failed: assignments.length - successCount,
          },
          effectiveDate: effectiveTimestamp.toISOString(),
        },
        message: `Bulk role assignment completed: ${successCount}/${assignments.length} successful`
      });

    } else {
      // Single role assignment
      const validation = assignRoleSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid role assignment data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const { userId, roleType, department, effectiveDate, reason, notifyUser } = validation.data;

      // TODO: Check if user has permission to assign roles
      // For now, we'll allow authenticated users to assign roles

      // Get current profile
      const currentProfile = await profilesRepository.getByUserId(userId);
      if (!currentProfile) {
        return NextResponse.json(
          { success: false, error: 'User profile not found' },
          { status: 404 }
        );
      }

      const effectiveTimestamp = effectiveDate ? new Date(effectiveDate) : new Date();

      // Update role and department
      const updatedProfile = await profilesRepository.update(userId, {
        roleType,
        department,
        updatedAt: effectiveTimestamp,
      });

      // Log role change
      console.log('Role assignment log:', {
        userId,
        previousRole: currentProfile.roleType,
        newRole: roleType,
        previousDepartment: currentProfile.department,
        newDepartment: department,
        reason,
        assignedBy: user.id,
        effectiveDate: effectiveTimestamp.toISOString(),
      });

      // TODO: Send notification if notifyUser is true
      if (notifyUser) {
        console.log(`Would notify user ${userId} about role change to ${roleType}`);
      }

      return NextResponse.json({
        success: true,
        data: {
          profile: updatedProfile,
          permissions: ROLE_PERMISSIONS[roleType],
          changes: {
            roleChanged: currentProfile.roleType !== roleType,
            departmentChanged: currentProfile.department !== department,
          },
          effectiveDate: effectiveTimestamp.toISOString(),
        },
        message: `Role assigned successfully: ${roleType} in ${department}`
      });
    }

  } catch (error) {
    console.error('Error in role assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profiles/roles
 * Get role information, permissions, and assignment history
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

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const includePermissions = searchParams.get('includePermissions') === 'true';
    const includeHistory = searchParams.get('includeHistory') === 'true';

    if (userId) {
      // Get role information for specific user
      const profile = await profilesRepository.getByUserId(userId);
      if (!profile) {
        return NextResponse.json(
          { success: false, error: 'User profile not found' },
          { status: 404 }
        );
      }

      const responseData: any = {
        userId,
        roleType: profile.roleType,
        department: profile.department,
        companyId: profile.companyId,
      };

      if (includePermissions) {
        responseData.permissions = ROLE_PERMISSIONS[profile.roleType];
      }

      if (includeHistory) {
        // TODO: Get role assignment history from audit logs
        responseData.history = [
          {
            roleType: profile.roleType,
            department: profile.department,
            effectiveDate: profile.updatedAt.toISOString(),
            assignedBy: 'system', // Placeholder
            reason: 'Initial assignment',
          }
        ];
      }

      return NextResponse.json({
        success: true,
        data: responseData,
        message: 'Role information retrieved successfully'
      });

    } else {
      // Get role system information
      return NextResponse.json({
        success: true,
        data: {
          availableRoles: [
            {
              name: 'corporativo',
              displayName: 'Corporativo',
              description: 'Full system access and user management',
              permissions: ROLE_PERMISSIONS.corporativo,
              level: 3,
            },
            {
              name: 'gerente',
              displayName: 'Gerente',
              description: 'Team management and reporting access',
              permissions: ROLE_PERMISSIONS.gerente,
              level: 2,
            },
            {
              name: 'empleado',
              displayName: 'Empleado',
              description: 'Basic user access for personal objectives',
              permissions: ROLE_PERMISSIONS.empleado,
              level: 1,
            },
          ],
          roleHierarchy: ['empleado', 'gerente', 'corporativo'],
          permissionCategories: {
            data_access: ['view_own_data', 'view_team_data', 'view_all_data'],
            user_management: ['manage_users', 'manage_team_members'],
            company_management: ['manage_companies', 'manage_settings'],
            analytics: ['view_team_analytics', 'view_analytics'],
            content_management: ['assign_objectives', 'manage_initiatives'],
          }
        },
        message: 'Role system information retrieved successfully'
      });
    }

  } catch (error) {
    console.error('Error getting role information:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profiles/roles
 * Update role permissions or role definitions (admin only)
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

    // TODO: Check if user has admin permissions
    // For now, we'll return not implemented

    return NextResponse.json(
      { success: false, error: 'Role definition updates not implemented yet' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error updating role definitions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}