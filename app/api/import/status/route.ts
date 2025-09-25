import { NextRequest, NextResponse } from 'next/server';
import { getDrizzleDb } from '@/lib/database/client';
import { profiles, users } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

// In-memory storage for import status tracking
// TODO: Replace with database table when schema is updated
const importStatusStorage: Map<string, ImportStatus> = new Map();

interface ImportStatus {
  importId: string;
  userId: string;
  companyId: string;
  fileName: string;
  fileType: 'xlsx' | 'csv';
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  currentOperation?: string;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    data: any;
  }>;
  startedAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number; // in seconds
}

/**
 * GET /api/import/status?importId=xxx - Get import status by ID
 * 
 * Query parameters:
 * - importId: string (required) - Import process ID
 * - userId: string (required) - Current user ID for authorization
 * 
 * Returns:
 * - importId: string
 * - status: 'processing' | 'completed' | 'failed' | 'cancelled'
 * - progress: object with detailed progress information
 * - errors: array of errors encountered during processing
 * - timing: object with timing information
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const importId = searchParams.get('importId');
    const userId = searchParams.get('userId');

    // Validate required parameters
    if (!importId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: importId, userId' },
        { status: 400 }
      );
    }

    // Verify user exists and get profile
    const db = getDrizzleDb();
    const userProfile = await db
      .select({
        userId: profiles.userId,
        fullName: profiles.fullName,
        roleType: profiles.roleType,
        department: profiles.department,
        companyId: profiles.companyId,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const profile = userProfile[0];

    // Get import status from storage
    const importStatus = importStatusStorage.get(importId);

    if (!importStatus) {
      return NextResponse.json(
        { error: 'Import not found or expired' },
        { status: 404 }
      );
    }

    // Verify user has access to this import (same company)
    if (importStatus.companyId !== profile.companyId) {
      return NextResponse.json(
        { error: 'Access denied. Import belongs to different company' },
        { status: 403 }
      );
    }

    // Calculate progress percentage
    const progressPercentage = importStatus.totalRecords > 0 
      ? Math.round((importStatus.processedRecords / importStatus.totalRecords) * 100)
      : 0;

    const response = {
      importId: importStatus.importId,
      status: importStatus.status,
      progress: {
        percentage: progressPercentage,
        totalRecords: importStatus.totalRecords,
        processedRecords: importStatus.processedRecords,
        successfulRecords: importStatus.successfulRecords,
        failedRecords: importStatus.failedRecords,
        currentOperation: importStatus.currentOperation,
      },
      file: {
        name: importStatus.fileName,
        type: importStatus.fileType,
      },
      errors: importStatus.errors,
      timing: {
        startedAt: importStatus.startedAt,
        completedAt: importStatus.completedAt,
        estimatedTimeRemaining: importStatus.estimatedTimeRemaining,
        duration: importStatus.completedAt 
          ? Math.round((new Date(importStatus.completedAt).getTime() - new Date(importStatus.startedAt).getTime()) / 1000)
          : Math.round((new Date().getTime() - new Date(importStatus.startedAt).getTime()) / 1000),
      },
    };

    return NextResponse.json({ data: response }, { status: 200 });

  } catch (error) {
    console.error('Error fetching import status:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching import status' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/import/status - Update import status (internal use)
 * 
 * This endpoint is used internally by the import process to update status
 * External clients should only read status via GET
 * 
 * Body parameters:
 * - importId: string (required)
 * - status: 'processing' | 'completed' | 'failed' | 'cancelled'
 * - processedRecords?: number
 * - successfulRecords?: number
 * - failedRecords?: number
 * - currentOperation?: string
 * - errors?: array
 * - estimatedTimeRemaining?: number
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      importId, 
      status, 
      processedRecords, 
      successfulRecords, 
      failedRecords,
      currentOperation,
      errors,
      estimatedTimeRemaining
    } = body;

    // Validate required fields
    if (!importId) {
      return NextResponse.json(
        { error: 'Missing required field: importId' },
        { status: 400 }
      );
    }

    // Get existing status
    const existingStatus = importStatusStorage.get(importId);
    
    if (!existingStatus) {
      return NextResponse.json(
        { error: 'Import not found' },
        { status: 404 }
      );
    }

    // Update status fields
    const updatedStatus: ImportStatus = {
      ...existingStatus,
      ...(status && { status }),
      ...(processedRecords !== undefined && { processedRecords }),
      ...(successfulRecords !== undefined && { successfulRecords }),
      ...(failedRecords !== undefined && { failedRecords }),
      ...(currentOperation && { currentOperation }),
      ...(errors && { errors: [...existingStatus.errors, ...errors] }),
      ...(estimatedTimeRemaining !== undefined && { estimatedTimeRemaining }),
    };

    // Set completion time if status is final
    if (status && ['completed', 'failed', 'cancelled'].includes(status)) {
      updatedStatus.completedAt = new Date().toISOString();
      updatedStatus.estimatedTimeRemaining = 0;
    }

    // Store updated status
    importStatusStorage.set(importId, updatedStatus);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Error updating import status:', error);
    return NextResponse.json(
      { error: 'Internal server error while updating import status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/import/status - Create new import status tracking entry (internal use)
 * 
 * Body parameters:
 * - importId: string (required)
 * - userId: string (required)
 * - companyId: string (required)
 * - fileName: string (required)
 * - fileType: 'xlsx' | 'csv' (required)
 * - totalRecords: number (required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { importId, userId, companyId, fileName, fileType, totalRecords } = body;

    // Validate required fields
    const requiredFields = ['importId', 'userId', 'companyId', 'fileName', 'fileType', 'totalRecords'];
    const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === null);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate fileType
    if (!['xlsx', 'csv'].includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid fileType. Must be xlsx or csv' },
        { status: 400 }
      );
    }

    // Create new import status
    const importStatus: ImportStatus = {
      importId,
      userId,
      companyId,
      fileName,
      fileType,
      status: 'processing',
      totalRecords,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      startedAt: new Date().toISOString(),
    };

    // Store status
    importStatusStorage.set(importId, importStatus);

    // Set cleanup timeout (1 hour) for completed imports
    setTimeout(() => {
      const currentStatus = importStatusStorage.get(importId);
      if (currentStatus && ['completed', 'failed', 'cancelled'].includes(currentStatus.status)) {
        importStatusStorage.delete(importId);
      }
    }, 60 * 60 * 1000);

    return NextResponse.json({ success: true }, { status: 201 });

  } catch (error) {
    console.error('Error creating import status:', error);
    return NextResponse.json(
      { error: 'Internal server error while creating import status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/import/status - Cancel import process
 * 
 * Query parameters:
 * - importId: string (required)
 * - userId: string (required)
 * 
 * This endpoint allows users to cancel an ongoing import process
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const importId = searchParams.get('importId');
    const userId = searchParams.get('userId');

    // Validate required parameters
    if (!importId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: importId, userId' },
        { status: 400 }
      );
    }

    // Verify user exists and get profile
    const db = getDrizzleDb();
    const userProfile = await db
      .select({
        userId: profiles.userId,
        companyId: profiles.companyId,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const profile = userProfile[0];

    // Get import status
    const importStatus = importStatusStorage.get(importId);

    if (!importStatus) {
      return NextResponse.json(
        { error: 'Import not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this import
    if (importStatus.companyId !== profile.companyId) {
      return NextResponse.json(
        { error: 'Access denied. Import belongs to different company' },
        { status: 403 }
      );
    }

    // Check if import can be cancelled (only if processing)
    if (importStatus.status !== 'processing') {
      return NextResponse.json(
        { error: `Cannot cancel import with status: ${importStatus.status}` },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const updatedStatus: ImportStatus = {
      ...importStatus,
      status: 'cancelled',
      completedAt: new Date().toISOString(),
      estimatedTimeRemaining: 0,
    };

    importStatusStorage.set(importId, updatedStatus);

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Error cancelling import:', error);
    return NextResponse.json(
      { error: 'Internal server error while cancelling import' },
      { status: 500 }
    );
  }
}

// Export the storage for use by other modules (for internal updates)
export { importStatusStorage };