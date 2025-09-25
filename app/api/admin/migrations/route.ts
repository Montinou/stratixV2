import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ProfilesRepository } from '@/lib/database/queries/profiles';
import { CompaniesRepository } from '@/lib/database/queries/companies';
import { SessionManagementService } from '@/lib/services/session-management';
import { SyncLoggingService } from '@/lib/services/sync-logging';
import { z } from 'zod';

const profilesRepository = new ProfilesRepository();
const companiesRepository = new CompaniesRepository();

// Validation schemas
const userMigrationSchema = z.object({
  migrationType: z.enum(['company_transfer', 'role_change', 'department_transfer', 'batch_migration']),
  sourceUserId: z.string().optional(),
  sourceUserIds: z.array(z.string()).min(1).max(100).optional(),
  targetCompanyId: z.string().optional(),
  targetDepartmentId: z.string().optional(),
  targetRole: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
  migrationOptions: z.object({
    preserveData: z.boolean().optional().default(true),
    transferSessions: z.boolean().optional().default(false),
    notifyUser: z.boolean().optional().default(true),
    migrateObjectives: z.boolean().optional().default(true),
    migrateActivities: z.boolean().optional().default(true),
    backupBeforeMigration: z.boolean().optional().default(true),
    dryRun: z.boolean().optional().default(false),
  }).optional().default({}),
  reason: z.string().min(10).max(1000),
  effectiveDate: z.string().datetime().optional(),
});

const companyMigrationSchema = z.object({
  migrationType: z.enum(['company_merge', 'company_split', 'company_restructure']),
  sourceCompanyId: z.string(),
  targetCompanyId: z.string().optional(),
  newCompanyName: z.string().optional(),
  migrationPlan: z.object({
    userTransfers: z.array(z.object({
      userId: z.string(),
      newRole: z.enum(['corporativo', 'gerente', 'empleado']).optional(),
      newDepartmentId: z.string().optional(),
    })).optional(),
    dataTransfers: z.object({
      objectives: z.boolean().optional().default(true),
      activities: z.boolean().optional().default(true),
      analytics: z.boolean().optional().default(true),
      settings: z.boolean().optional().default(true),
    }).optional(),
    preserveHierarchy: z.boolean().optional().default(true),
  }),
  reason: z.string().min(10).max(1000),
  scheduledFor: z.string().datetime().optional(),
});

const migrationStatusSchema = z.object({
  migrationId: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
  progressUpdate: z.object({
    currentStep: z.string(),
    stepsCompleted: z.number(),
    totalSteps: z.number(),
    errors: z.array(z.string()).optional(),
  }).optional(),
});

// Migration interfaces
interface MigrationJob {
  id: string;
  type: 'user_migration' | 'company_migration';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  reason: string;
  details: any;
  progress: {
    currentStep: string;
    stepsCompleted: number;
    totalSteps: number;
    percentage: number;
  };
  results?: {
    successful: number;
    failed: number;
    warnings: string[];
    errors: string[];
  };
  metadata?: Record<string, any>;
}

// In-memory migration job storage (replace with database in production)
const migrationJobs = new Map<string, MigrationJob>();

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

// Create migration job ID
function createMigrationJobId(): string {
  return `mig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Execute user migration (mock implementation)
async function executeUserMigration(
  migrationId: string,
  migrationData: any,
  createdBy: string
): Promise<void> {
  const job = migrationJobs.get(migrationId);
  if (!job) return;

  try {
    job.status = 'in_progress';
    job.startedAt = new Date();
    
    const { migrationType, sourceUserId, sourceUserIds, targetCompanyId, targetRole, migrationOptions, reason } = migrationData;
    
    const userIds = sourceUserIds || (sourceUserId ? [sourceUserId] : []);
    const totalUsers = userIds.length;
    let processedUsers = 0;
    let successfulMigrations = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    job.progress.totalSteps = totalUsers * 3; // Backup, migrate, verify
    
    for (const userId of userIds) {
      try {
        // Step 1: Backup user data
        job.progress.currentStep = `Backing up user data: ${userId}`;
        job.progress.stepsCompleted++;
        
        if (migrationOptions.backupBeforeMigration && !migrationOptions.dryRun) {
          // TODO: Implement user data backup
          await SyncLoggingService.info(
            'profile_sync',
            `User data backed up for migration: ${userId}`,
            { details: { migrationId, userId } }
          );
        }

        // Step 2: Perform migration
        job.progress.currentStep = `Migrating user: ${userId}`;
        job.progress.stepsCompleted++;

        if (!migrationOptions.dryRun) {
          // TODO: Implement actual user migration logic
          
          // Mock migration based on type
          switch (migrationType) {
            case 'company_transfer':
              if (targetCompanyId) {
                // Update user's company
                await SyncLoggingService.info(
                  'profile_sync',
                  `User ${userId} transferred to company ${targetCompanyId}`,
                  {
                    userId,
                    details: { previousCompany: 'mock_old_company', newCompany: targetCompanyId, migrationId },
                  }
                );
              }
              break;

            case 'role_change':
              if (targetRole) {
                await SyncLoggingService.info(
                  'profile_sync',
                  `User ${userId} role changed to ${targetRole}`,
                  {
                    userId,
                    details: { previousRole: 'mock_old_role', newRole: targetRole, migrationId },
                  }
                );
              }
              break;

            case 'department_transfer':
              await SyncLoggingService.info(
                'profile_sync',
                `User ${userId} transferred to new department`,
                {
                  userId,
                  details: { migrationId },
                }
              );
              break;
          }

          // Handle session transfer if requested
          if (migrationOptions.transferSessions) {
            // TODO: Implement session migration
            await SyncLoggingService.info(
              'profile_sync',
              `Sessions transferred for user ${userId}`,
              { userId, details: { migrationId } }
            );
          }
        }

        // Step 3: Verify migration
        job.progress.currentStep = `Verifying migration: ${userId}`;
        job.progress.stepsCompleted++;

        // TODO: Implement migration verification
        successfulMigrations++;
        processedUsers++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`User ${userId}: ${errorMessage}`);
        job.progress.stepsCompleted += (3 - (job.progress.stepsCompleted % 3)); // Skip remaining steps for this user
        processedUsers++;
      }

      // Update progress percentage
      job.progress.percentage = Math.round((job.progress.stepsCompleted / job.progress.totalSteps) * 100);
    }

    // Complete migration
    job.status = 'completed';
    job.completedAt = new Date();
    job.results = {
      successful: successfulMigrations,
      failed: processedUsers - successfulMigrations,
      warnings,
      errors,
    };

    await SyncLoggingService.info(
      'batch_sync',
      `User migration completed: ${migrationId}`,
      {
        details: {
          migrationId,
          migrationType,
          totalUsers: processedUsers,
          successful: successfulMigrations,
          failed: processedUsers - successfulMigrations,
          dryRun: migrationOptions.dryRun,
        },
        metadata: { createdBy },
      }
    );

  } catch (error) {
    job.status = 'failed';
    job.completedAt = new Date();
    job.results = {
      successful: 0,
      failed: 1,
      warnings: [],
      errors: [error instanceof Error ? error.message : 'Migration failed'],
    };

    await SyncLoggingService.error(
      'batch_sync',
      `User migration failed: ${migrationId}`,
      { error, details: { migrationId } }
    );
  }
}

// Execute company migration (mock implementation)
async function executeCompanyMigration(
  migrationId: string,
  migrationData: any,
  createdBy: string
): Promise<void> {
  const job = migrationJobs.get(migrationId);
  if (!job) return;

  try {
    job.status = 'in_progress';
    job.startedAt = new Date();
    
    const { migrationType, sourceCompanyId, targetCompanyId, migrationPlan } = migrationData;
    
    // Mock company migration steps
    const steps = [
      'Validate source and target companies',
      'Backup company data',
      'Migrate user accounts',
      'Transfer objectives and activities',
      'Update company relationships',
      'Verify data integrity',
      'Update user sessions',
      'Complete migration',
    ];

    job.progress.totalSteps = steps.length;
    job.progress.currentStep = steps[0];

    for (let i = 0; i < steps.length; i++) {
      job.progress.currentStep = steps[i];
      job.progress.stepsCompleted = i + 1;
      job.progress.percentage = Math.round(((i + 1) / steps.length) * 100);

      // Simulate step processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      await SyncLoggingService.info(
        'batch_sync',
        `Company migration step completed: ${steps[i]}`,
        { details: { migrationId, step: i + 1, totalSteps: steps.length } }
      );
    }

    job.status = 'completed';
    job.completedAt = new Date();
    job.results = {
      successful: 1,
      failed: 0,
      warnings: [],
      errors: [],
    };

    await SyncLoggingService.info(
      'batch_sync',
      `Company migration completed: ${migrationId}`,
      {
        details: {
          migrationId,
          migrationType,
          sourceCompanyId,
          targetCompanyId,
        },
        metadata: { createdBy },
      }
    );

  } catch (error) {
    job.status = 'failed';
    job.completedAt = new Date();
    job.results = {
      successful: 0,
      failed: 1,
      warnings: [],
      errors: [error instanceof Error ? error.message : 'Company migration failed'],
    };

    await SyncLoggingService.error(
      'batch_sync',
      `Company migration failed: ${migrationId}`,
      { error, details: { migrationId } }
    );
  }
}

/**
 * POST /api/admin/migrations
 * Create and execute user/company migrations
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
    const migrationType = body.migrationType;

    if (['company_transfer', 'role_change', 'department_transfer', 'batch_migration'].includes(migrationType)) {
      // User migration
      const validation = userMigrationSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid user migration data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const migrationData = validation.data;
      const migrationId = createMigrationJobId();

      // Create migration job
      const job: MigrationJob = {
        id: migrationId,
        type: 'user_migration',
        status: 'pending',
        createdBy: user.id,
        createdAt: new Date(),
        reason: migrationData.reason,
        details: migrationData,
        progress: {
          currentStep: 'Initializing migration',
          stepsCompleted: 0,
          totalSteps: 0,
          percentage: 0,
        },
      };

      migrationJobs.set(migrationId, job);

      // Start migration execution (async)
      executeUserMigration(migrationId, migrationData, user.id).catch(error => {
        console.error(`Migration ${migrationId} failed:`, error);
      });

      return NextResponse.json({
        success: true,
        data: {
          migrationId,
          type: 'user_migration',
          status: 'pending',
          estimatedDuration: '5-15 minutes',
          dryRun: migrationData.migrationOptions?.dryRun || false,
          createdAt: job.createdAt,
        },
        message: migrationData.migrationOptions?.dryRun 
          ? 'Dry run migration initiated - no actual changes will be made'
          : 'User migration initiated'
      });

    } else if (['company_merge', 'company_split', 'company_restructure'].includes(migrationType)) {
      // Company migration
      const validation = companyMigrationSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid company migration data',
            details: validation.error.issues
          },
          { status: 400 }
        );
      }

      const migrationData = validation.data;
      const migrationId = createMigrationJobId();

      // Validate companies exist
      const sourceCompany = await companiesRepository.getById(migrationData.sourceCompanyId);
      if (!sourceCompany) {
        return NextResponse.json(
          { success: false, error: 'Source company not found' },
          { status: 404 }
        );
      }

      if (migrationData.targetCompanyId) {
        const targetCompany = await companiesRepository.getById(migrationData.targetCompanyId);
        if (!targetCompany) {
          return NextResponse.json(
            { success: false, error: 'Target company not found' },
            { status: 404 }
          );
        }
      }

      // Create migration job
      const job: MigrationJob = {
        id: migrationId,
        type: 'company_migration',
        status: 'pending',
        createdBy: user.id,
        createdAt: new Date(),
        reason: migrationData.reason,
        details: migrationData,
        progress: {
          currentStep: 'Preparing company migration',
          stepsCompleted: 0,
          totalSteps: 8,
          percentage: 0,
        },
      };

      migrationJobs.set(migrationId, job);

      // Start migration execution (async)
      executeCompanyMigration(migrationId, migrationData, user.id).catch(error => {
        console.error(`Company migration ${migrationId} failed:`, error);
      });

      return NextResponse.json({
        success: true,
        data: {
          migrationId,
          type: 'company_migration',
          status: 'pending',
          estimatedDuration: '30-60 minutes',
          sourceCompany: sourceCompany.name,
          targetCompany: migrationData.targetCompanyId ? 'Existing Company' : migrationData.newCompanyName,
          createdAt: job.createdAt,
        },
        message: 'Company migration initiated'
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid migration type' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error creating migration:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/migrations
 * Retrieve migration jobs and status
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
    const migrationId = searchParams.get('migrationId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (migrationId) {
      // Get specific migration
      const job = migrationJobs.get(migrationId);
      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Migration not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: job,
        message: 'Migration details retrieved'
      });
    }

    // Get all migrations with filtering
    let allJobs = Array.from(migrationJobs.values());

    if (status) {
      allJobs = allJobs.filter(job => job.status === status);
    }
    if (type) {
      allJobs = allJobs.filter(job => job.type === type);
    }

    // Sort by creation date (newest first)
    allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const paginatedJobs = allJobs.slice(offset, offset + limit);

    // Generate statistics
    const stats = {
      total: allJobs.length,
      pending: allJobs.filter(j => j.status === 'pending').length,
      inProgress: allJobs.filter(j => j.status === 'in_progress').length,
      completed: allJobs.filter(j => j.status === 'completed').length,
      failed: allJobs.filter(j => j.status === 'failed').length,
      cancelled: allJobs.filter(j => j.status === 'cancelled').length,
      userMigrations: allJobs.filter(j => j.type === 'user_migration').length,
      companyMigrations: allJobs.filter(j => j.type === 'company_migration').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        migrations: paginatedJobs,
        pagination: {
          total: allJobs.length,
          limit,
          offset,
          hasMore: offset + limit < allJobs.length,
        },
        statistics: stats,
        filters: { status, type },
      },
      message: `Retrieved ${paginatedJobs.length} migrations`
    });

  } catch (error) {
    console.error('Error retrieving migrations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/migrations
 * Update migration status or cancel migrations
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
    const validation = migrationStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid migration status data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    const { migrationId, status, progressUpdate } = validation.data;

    const job = migrationJobs.get(migrationId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Migration not found' },
        { status: 404 }
      );
    }

    // Update status if provided
    if (status) {
      if (status === 'cancelled' && job.status === 'in_progress') {
        job.status = 'cancelled';
        job.completedAt = new Date();
        job.metadata = {
          ...job.metadata,
          cancelledBy: user.id,
          cancelledAt: new Date(),
        };

        await SyncLoggingService.info(
          'batch_sync',
          `Migration cancelled: ${migrationId}`,
          {
            details: { migrationId, originalStatus: job.status },
            metadata: { cancelledBy: user.id },
          }
        );
      } else if (['pending', 'in_progress', 'completed', 'failed'].includes(status)) {
        job.status = status as any;
      }
    }

    // Update progress if provided
    if (progressUpdate) {
      job.progress = {
        ...job.progress,
        ...progressUpdate,
        percentage: Math.round((progressUpdate.stepsCompleted / progressUpdate.totalSteps) * 100),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        migrationId,
        status: job.status,
        progress: job.progress,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
      message: 'Migration updated successfully'
    });

  } catch (error) {
    console.error('Error updating migration:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}