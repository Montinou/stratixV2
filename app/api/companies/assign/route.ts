import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { CompaniesRepository } from '@/lib/database/queries/companies';
import { z } from 'zod';

const profilesRepository = new ProfilesRepository();
const companiesRepository = new CompaniesRepository();

// Validation schema for user assignment
const assignUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  companyId: z.string().min(1, 'Company ID is required'),
  role: z.enum(['corporativo', 'gerente', 'empleado']).optional().default('empleado'),
  department: z.string().min(1, 'Department is required').max(100),
  notifyUser: z.boolean().optional().default(true),
});

// Validation schema for bulk assignment
const bulkAssignSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required').max(50, 'Maximum 50 users per batch'),
  companyId: z.string().min(1, 'Company ID is required'),
  role: z.enum(['corporativo', 'gerente', 'empleado']).optional().default('empleado'),
  department: z.string().min(1, 'Department is required').max(100),
  notifyUsers: z.boolean().optional().default(true),
});

// Validation schema for domain-based assignment
const domainAssignmentSchema = z.object({
  emailDomain: z.string().min(3, 'Email domain is required').regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid domain format'),
  companyId: z.string().min(1, 'Company ID is required'),
  defaultRole: z.enum(['corporativo', 'gerente', 'empleado']).optional().default('empleado'),
  defaultDepartment: z.string().min(1, 'Department is required').max(100),
  autoAssign: z.boolean().optional().default(false),
});

/**
 * POST /api/companies/assign
 * Assign users to companies with roles and departments
 * Supports single user, bulk assignment, and domain-based rules
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

    // TODO: Check if user has admin permissions for company assignment
    // For now, we'll allow authenticated users to assign

    const body = await request.json();
    const assignmentType = body.assignmentType || 'user';

    switch (assignmentType) {
      case 'user': {
        // Single user assignment
        const validation = assignUserSchema.safeParse(body);
        
        if (!validation.success) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid assignment data',
              details: validation.error.issues
            },
            { status: 400 }
          );
        }

        const { userId, companyId, role, department, notifyUser } = validation.data;

        // Verify company exists
        const company = await companiesRepository.getById(companyId);
        if (!company) {
          return NextResponse.json(
            { success: false, error: 'Company not found' },
            { status: 404 }
          );
        }

        // Update user's profile with company assignment
        try {
          const updatedProfile = await profilesRepository.update(userId, {
            companyId,
            roleType: role,
            department,
          });

          // TODO: Send notification if notifyUser is true
          if (notifyUser) {
            console.log(`Would notify user ${userId} about company assignment to ${company.name}`);
          }

          return NextResponse.json({
            success: true,
            data: {
              profile: updatedProfile,
              company: company,
              assignment: {
                userId,
                companyId,
                role,
                department,
              }
            },
            message: `User assigned to ${company.name} successfully`
          });

        } catch (updateError) {
          if (updateError instanceof Error && updateError.message.includes('not found')) {
            return NextResponse.json(
              { success: false, error: 'User profile not found' },
              { status: 404 }
            );
          }
          throw updateError;
        }
      }

      case 'bulk': {
        // Bulk user assignment
        const validation = bulkAssignSchema.safeParse(body);
        
        if (!validation.success) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid bulk assignment data',
              details: validation.error.issues
            },
            { status: 400 }
          );
        }

        const { userIds, companyId, role, department, notifyUsers } = validation.data;

        // Verify company exists
        const company = await companiesRepository.getById(companyId);
        if (!company) {
          return NextResponse.json(
            { success: false, error: 'Company not found' },
            { status: 404 }
          );
        }

        // Process bulk assignment
        const results = [];
        
        for (const userId of userIds) {
          try {
            const updatedProfile = await profilesRepository.update(userId, {
              companyId,
              roleType: role,
              department,
            });

            results.push({
              userId,
              success: true,
              profile: updatedProfile,
              error: null,
            });

            // TODO: Send notification if notifyUsers is true
            if (notifyUsers) {
              console.log(`Would notify user ${userId} about company assignment to ${company.name}`);
            }

          } catch (error) {
            results.push({
              userId,
              success: false,
              profile: null,
              error: error instanceof Error ? error.message : 'Assignment failed',
            });
          }
        }

        const successCount = results.filter(r => r.success).length;

        return NextResponse.json({
          success: true,
          data: {
            results,
            company,
            summary: {
              total: userIds.length,
              successful: successCount,
              failed: userIds.length - successCount,
            }
          },
          message: `Bulk assignment completed: ${successCount}/${userIds.length} users assigned to ${company.name}`
        });
      }

      case 'domain': {
        // Domain-based assignment rule
        const validation = domainAssignmentSchema.safeParse(body);
        
        if (!validation.success) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Invalid domain assignment data',
              details: validation.error.issues
            },
            { status: 400 }
          );
        }

        const { emailDomain, companyId, defaultRole, defaultDepartment, autoAssign } = validation.data;

        // Verify company exists
        const company = await companiesRepository.getById(companyId);
        if (!company) {
          return NextResponse.json(
            { success: false, error: 'Company not found' },
            { status: 404 }
          );
        }

        // TODO: Store domain assignment rule in database
        // For now, we'll just return the configuration
        const domainRule = {
          emailDomain,
          companyId,
          defaultRole,
          defaultDepartment,
          autoAssign,
          createdAt: new Date().toISOString(),
          createdBy: user.id,
        };

        console.log('Domain assignment rule created:', domainRule);

        return NextResponse.json({
          success: true,
          data: {
            rule: domainRule,
            company,
          },
          message: `Domain assignment rule created for ${emailDomain} → ${company.name}`
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid assignment type. Use: user, bulk, or domain' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in company assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/companies/assign
 * Get assignment rules and statistics
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

    // TODO: Get actual assignment rules from database
    // For now, return mock data
    const assignmentRules = [
      {
        id: '1',
        type: 'domain',
        emailDomain: 'company.com',
        companyId: companyId || 'default-company-id',
        defaultRole: 'empleado',
        defaultDepartment: 'General',
        autoAssign: true,
        createdAt: new Date().toISOString(),
      }
    ];

    // TODO: Get assignment statistics
    const statistics = {
      totalAssignments: 0,
      assignmentsThisMonth: 0,
      activeRules: assignmentRules.length,
      pendingAssignments: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        rules: companyId ? assignmentRules.filter(r => r.companyId === companyId) : assignmentRules,
        statistics,
        supportedTypes: ['user', 'bulk', 'domain'],
      },
      message: 'Assignment rules retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting assignment rules:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}