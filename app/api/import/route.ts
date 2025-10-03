import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { ImportServiceV2 as ImportService, ImportType } from '@/lib/services/import-service-v2';

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const importType = formData.get('type') as ImportType;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!importType) {
      return NextResponse.json({ error: 'Import type not specified' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    if (!fileExtension || !['csv', 'xlsx'].includes(fileExtension)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV and XLSX files are supported.' },
        { status: 400 }
      );
    }

    // Get user permissions
    const userPermissions = await ImportService.getUserPermissions(user.id);

    if (!userPermissions) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { role: userRole, areaId: userAreaId, companyId } = userPermissions;

    // Check if user has a company assigned
    if (!companyId) {
      return NextResponse.json(
        { error: 'User must be assigned to a company to import data' },
        { status: 403 }
      );
    }

    // Employees cannot import anything
    if (userRole === 'empleado') {
      return NextResponse.json(
        { error: 'Los empleados no tienen permisos para importar datos' },
        { status: 403 }
      );
    }

    // Role-based restrictions
    if (importType === 'users' && userRole !== 'corporativo') {
      return NextResponse.json(
        { error: 'Only corporate users can import users' },
        { status: 403 }
      );
    }

    // Parse file content
    let data: any[] = [];

    if (fileExtension === 'csv') {
      const text = await file.text();
      data = await ImportService.parseCSV(text);
    } else if (fileExtension === 'xlsx') {
      const buffer = await file.arrayBuffer();
      data = ImportService.parseXLSX(buffer);
    }

    if (data.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Create import log
    const logId = await ImportService.createImportLog(
      user.id,
      companyId,
      fileName,
      fileExtension as 'csv' | 'xlsx',
      importType,
      data.length
    );

    // Process import based on type
    let result;

    try {
      switch (importType) {
        case 'objectives':
          result = await ImportService.importObjectives(
            data,
            user.id,
            companyId,
            userRole,
            userAreaId
          );
          break;

        case 'initiatives':
          result = await ImportService.importInitiatives(
            data,
            user.id,
            companyId,
            userRole,
            userAreaId
          );
          break;

        case 'activities':
          result = await ImportService.importActivities(
            data,
            user.id,
            companyId,
            userRole,
            userAreaId
          );
          break;

        case 'users':
          result = await ImportService.importUsers(
            data,
            user.id,
            companyId,
            userRole
          );
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid import type' },
            { status: 400 }
          );
      }

      // Update import log with results
      await ImportService.updateImportLog(
        logId,
        result.success ? 'completed' : 'failed',
        result.successfulRecords,
        result.failedRecords,
        result.errors.length > 0 ? result.errors : null
      );

      return NextResponse.json({
        success: result.success,
        logId,
        totalRecords: result.totalRecords,
        successfulRecords: result.successfulRecords,
        failedRecords: result.failedRecords,
        errors: result.errors
      });

    } catch (error: any) {
      // Update import log with error
      await ImportService.updateImportLog(
        logId,
        'failed',
        0,
        data.length,
        { message: error.message }
      );

      throw error;
    }

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's company
    const userPermissions = await ImportService.getUserPermissions(user.id);

    if (!userPermissions) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!userPermissions.companyId) {
      // Return empty history if user has no company assigned
      return NextResponse.json([]);
    }

    // Get import history
    const history = await ImportService.getImportHistory(userPermissions.companyId);

    return NextResponse.json(history);

  } catch (error: any) {
    console.error('Error fetching import history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch import history' },
      { status: 500 }
    );
  }
}