import { NextRequest, NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';
import Papa, { ParseResult } from 'papaparse';
import { getDrizzleDb } from '@/lib/database/client';
import { objectives, initiatives, activities, profiles } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import type { ImportTemplate, ImportResult, ImportError } from '@/lib/types/import';

const UPLOAD_DIR = '/tmp/okr-imports';

interface ProcessImportRequest {
  fileId: string;
  userId: string;
  userRole: string;
  userDepartment: string;
  options?: {
    periodStart?: string;
    periodEnd?: string;
    departmentMapping?: Record<string, string>;
    previewMode?: boolean; // If true, only validate and return preview
  };
}

/**
 * POST /api/import/process - Process uploaded file for data import
 * 
 * Body parameters:
 * - fileId: string (required) - File ID from upload endpoint
 * - userId: string (required) - Current user ID
 * - userRole: string (required) - User role (corporativo, gerente)
 * - userDepartment: string (required) - User department
 * - options: object (optional)
 *   - periodStart: string (ISO date) - Filter start date for XLSX imports
 *   - periodEnd: string (ISO date) - Filter end date for XLSX imports
 *   - departmentMapping: object - Department name mapping for CSV imports
 *   - previewMode: boolean - If true, only validate and return preview without importing
 * 
 * Returns:
 * - importId: string - Unique identifier for this import process
 * - status: 'processing' | 'completed' | 'failed'
 * - totalRecords: number - Total records to be processed
 * - validRecords: number - Valid records found
 * - preview?: ImportTemplate[] - First 10 valid records if previewMode
 * - errors: ImportError[] - Validation errors found
 */
export async function POST(request: NextRequest) {
  const db = getDrizzleDb();
  let tempFilePath: string | null = null;
  
  try {
    const body: ProcessImportRequest = await request.json();
    const { fileId, userId, userRole, userDepartment, options = {} } = body;

    // Validate required fields
    if (!fileId || !userId || !userRole || !userDepartment) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId, userId, userRole, userDepartment' },
        { status: 400 }
      );
    }

    // Validate user role and permissions
    if (!['corporativo', 'gerente'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Access denied. Only Corporativo and Gerente roles can process imports' },
        { status: 403 }
      );
    }

    // Verify user exists and has correct profile
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
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const profile = userProfile[0];
    if (profile.roleType !== userRole || profile.department !== userDepartment) {
      return NextResponse.json(
        { error: 'User role or department mismatch' },
        { status: 403 }
      );
    }

    // Construct file path from fileId
    const xlsxPath = join(UPLOAD_DIR, `${fileId}.xlsx`);
    const csvPath = join(UPLOAD_DIR, `${fileId}.csv`);

    let filePath: string;
    let fileType: 'xlsx' | 'csv';

    // Determine which file exists
    try {
      await readFile(xlsxPath);
      filePath = xlsxPath;
      fileType = 'xlsx';
    } catch {
      try {
        await readFile(csvPath);
        filePath = csvPath;
        fileType = 'csv';
      } catch {
        return NextResponse.json(
          { error: 'Uploaded file not found or expired' },
          { status: 404 }
        );
      }
    }

    tempFilePath = filePath;
    const importId = `import_${fileId}_${Date.now()}`;

    // Process file based on type
    let importResult: ImportResult;
    
    if (fileType === 'xlsx') {
      importResult = await processXLSXFile(
        filePath,
        profile,
        options.periodStart,
        options.periodEnd,
        options.previewMode || false
      );
    } else {
      importResult = await processCSVFile(
        filePath,
        profile,
        options.departmentMapping,
        options.previewMode || false
      );
    }

    // Clean up temporary file after processing
    try {
      await unlink(tempFilePath);
      tempFilePath = null;
    } catch (error) {
      console.warn(`Failed to clean up temporary file ${tempFilePath}:`, error);
    }

    // Create import log entry (simplified version without dedicated table)
    const importLog = {
      id: importId,
      company_id: profile.companyId,
      user_id: userId,
      file_name: `${fileId}.${fileType}`,
      file_type: fileType,
      status: importResult.success ? 'completed' : (importResult.errors.length > 0 ? 'failed' : 'processing'),
      total_records: importResult.totalRecords,
      successful_records: importResult.successfulRecords,
      failed_records: importResult.failedRecords,
      error_details: importResult.errors,
      import_period_start: options.periodStart,
      import_period_end: options.periodEnd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Import log stored in console for now, database logging can be added later
    console.log('Import processed:', importLog);

    const response = {
      importId,
      status: importLog.status as 'processing' | 'completed' | 'failed',
      totalRecords: importResult.totalRecords,
      validRecords: importResult.successfulRecords,
      errors: importResult.errors,
      ...(options.previewMode && { preview: (importResult as any).preview }),
    };

    return NextResponse.json({ data: response }, { status: 200 });

  } catch (error) {
    console.error('Error processing import:', error);

    // Clean up temporary file on error
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn(`Failed to clean up temporary file on error:`, cleanupError);
      }
    }

    return NextResponse.json(
      { error: 'Internal server error during import processing' },
      { status: 500 }
    );
  }
}

async function processXLSXFile(
  filePath: string,
  userProfile: any,
  periodStart?: string,
  periodEnd?: string,
  previewMode: boolean = false
): Promise<ImportResult> {
  const db = getDrizzleDb();
  
  try {
    const fileBuffer = await readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const allData: ImportTemplate[] = [];
    const errors: ImportError[] = [];
    let rowCounter = 0;

    // Process each sheet (each sheet represents a department/area)
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) continue; // Skip empty sheets

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        rowCounter++;

        try {
          const rowData = parseRowData(headers, row, sheetName);
          if (rowData) {
            // Apply period filter if specified
            if (periodStart && periodEnd) {
              const startDate = new Date(rowData.start_date);
              const endDate = new Date(rowData.end_date);
              const filterStart = new Date(periodStart);
              const filterEnd = new Date(periodEnd);

              if (startDate >= filterStart && endDate <= filterEnd) {
                allData.push(rowData);
              }
            } else {
              allData.push(rowData);
            }
          }
        } catch (error) {
          errors.push({
            row: i + 2, // +2 because of header and 0-based index
            field: 'general',
            message: error instanceof Error ? error.message : 'Error parsing row',
            data: row,
          });
        }
      }
    }

    if (previewMode) {
      return {
        success: errors.length === 0,
        totalRecords: allData.length,
        successfulRecords: Math.min(allData.length, 10),
        failedRecords: errors.length,
        errors,
        preview: allData.slice(0, 10), // Return first 10 records for preview
      } as any;
    }

    return await processImportData(allData, errors, userProfile);

  } catch (error) {
    return {
      success: false,
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 1,
      errors: [
        {
          row: 0,
          field: 'file',
          message: error instanceof Error ? error.message : 'Error reading XLSX file',
          data: null,
        },
      ],
    };
  }
}

async function processCSVFile(
  filePath: string,
  userProfile: any,
  departmentMapping?: Record<string, string>,
  previewMode: boolean = false
): Promise<ImportResult> {
  return new Promise(async (resolve) => {
    try {
      const fileContent = await readFile(filePath, 'utf-8');

      Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: ParseResult<any>) => {
          try {
            const allData: ImportTemplate[] = [];
            const errors: ImportError[] = [];

            results.data.forEach((row: any, index: number) => {
              try {
                const rowData = parseCSVRow(row, departmentMapping);
                if (rowData) {
                  allData.push(rowData);
                }
              } catch (error) {
                errors.push({
                  row: index + 2,
                  field: 'general',
                  message: error instanceof Error ? error.message : 'Error parsing row',
                  data: row,
                });
              }
            });

            if (previewMode) {
              resolve({
                success: errors.length === 0,
                totalRecords: allData.length,
                successfulRecords: Math.min(allData.length, 10),
                failedRecords: errors.length,
                errors,
                preview: allData.slice(0, 10),
              } as any);
              return;
            }

            const result = await processImportData(allData, errors, userProfile);
            resolve(result);
          } catch (error) {
            resolve({
              success: false,
              totalRecords: 0,
              successfulRecords: 0,
              failedRecords: 1,
              errors: [
                {
                  row: 0,
                  field: 'file',
                  message: error instanceof Error ? error.message : 'Error processing CSV',
                  data: null,
                },
              ],
            });
          }
        },
        error: (error: any) => {
          resolve({
            success: false,
            totalRecords: 0,
            successfulRecords: 0,
            failedRecords: 1,
            errors: [
              {
                row: 0,
                field: 'file',
                message: error.message,
                data: null,
              },
            ],
          });
        },
      });
    } catch (error) {
      resolve({
        success: false,
        totalRecords: 0,
        successfulRecords: 0,
        failedRecords: 1,
        errors: [
          {
            row: 0,
            field: 'file',
            message: error instanceof Error ? error.message : 'Error reading CSV file',
            data: null,
          },
        ],
      });
    }
  });
}

function parseRowData(headers: string[], row: any[], department?: string): ImportTemplate | null {
  if (!row || row.length === 0) return null;

  const data: any = {};
  headers.forEach((header, index) => {
    data[header.toLowerCase().replace(/\s+/g, '_')] = row[index];
  });

  // Validate required fields
  if (!data.title || !data.owner_email || !data.start_date || !data.end_date) {
    throw new Error('Missing required fields: title, owner_email, start_date, end_date');
  }

  return {
    type: data.type || 'objective',
    title: data.title,
    description: data.description || '',
    owner_email: data.owner_email,
    department: data.department || department || '',
    status: mapStatus(data.status),
    progress: parseInt(data.progress) || 0,
    start_date: data.start_date,
    end_date: data.end_date,
    parent_title: data.parent_title,
  };
}

function parseCSVRow(row: any, departmentMapping?: Record<string, string>): ImportTemplate | null {
  if (!row.title || !row.owner_email) return null;

  const department = departmentMapping?.[row.department] || row.department || '';

  return {
    type: row.type || 'objective',
    title: row.title,
    description: row.description || '',
    owner_email: row.owner_email,
    department,
    status: mapStatus(row.status),
    progress: parseInt(row.progress) || 0,
    start_date: row.start_date,
    end_date: row.end_date,
    parent_title: row.parent_title,
  };
}

function mapStatus(status: string): 'no_iniciado' | 'en_progreso' | 'completado' | 'pausado' {
  const statusMap: Record<string, 'no_iniciado' | 'en_progreso' | 'completado' | 'pausado'> = {
    'no_iniciado': 'no_iniciado',
    'en_progreso': 'en_progreso',
    'completado': 'completado',
    'pausado': 'pausado',
    // English variants
    'not_started': 'no_iniciado',
    'in_progress': 'en_progreso',
    'completed': 'completado',
    'paused': 'pausado',
    // Other variants
    'draft': 'no_iniciado',
    'active': 'en_progreso',
    'done': 'completado',
    'cancelled': 'pausado',
  };

  return statusMap[status?.toLowerCase()] || 'no_iniciado';
}

async function processImportData(
  data: ImportTemplate[],
  errors: ImportError[],
  userProfile: any
): Promise<ImportResult> {
  const db = getDrizzleDb();
  let successfulRecords = 0;
  const totalRecords = data.length;

  // Process each record
  for (const record of data) {
    try {
      await createOKRRecord(record, userProfile, db);
      successfulRecords++;
    } catch (error) {
      errors.push({
        row: data.indexOf(record) + 1,
        field: 'database',
        message: error instanceof Error ? error.message : 'Database error',
        data: record,
      });
    }
  }

  return {
    success: errors.length === 0,
    totalRecords,
    successfulRecords,
    failedRecords: totalRecords - successfulRecords,
    errors,
  };
}

async function createOKRRecord(record: ImportTemplate, userProfile: any, db: any): Promise<void> {
  // Find owner by email
  const ownerResult = await db
    .select({
      userId: profiles.userId,
      companyId: profiles.companyId,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.userId, users.id))
    .where(eq(users.email, record.owner_email))
    .limit(1);

  if (ownerResult.length === 0) {
    throw new Error(`Owner not found for email: ${record.owner_email}`);
  }

  const owner = ownerResult[0];

  // Ensure owner belongs to same company
  if (owner.companyId !== userProfile.companyId) {
    throw new Error(`Owner ${record.owner_email} does not belong to the same company`);
  }

  const startDate = new Date(record.start_date);
  const endDate = new Date(record.end_date);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format in start_date or end_date');
  }

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  // Map import status to database status
  const statusMap = {
    'no_iniciado': 'draft',
    'en_progreso': 'in_progress',
    'completado': 'completed',
    'pausado': 'cancelled',
  } as const;

  const dbStatus = statusMap[record.status] || 'draft';

  if (record.type === 'objective') {
    await db.insert(objectives).values({
      title: record.title,
      description: record.description,
      department: record.department,
      status: dbStatus,
      priority: 'medium',
      progress: record.progress,
      startDate,
      endDate,
      ownerId: owner.userId,
      companyId: userProfile.companyId,
    });
  } else if (record.type === 'initiative') {
    // Find parent objective by title
    if (!record.parent_title) {
      throw new Error('Initiatives must have a parent_title');
    }

    const parentObjective = await db
      .select({ id: objectives.id })
      .from(objectives)
      .where(
        and(
          eq(objectives.title, record.parent_title),
          eq(objectives.companyId, userProfile.companyId)
        )
      )
      .limit(1);

    if (parentObjective.length === 0) {
      throw new Error(`Parent objective not found: ${record.parent_title}`);
    }

    await db.insert(initiatives).values({
      objectiveId: parentObjective[0].id,
      title: record.title,
      description: record.description,
      status: dbStatus === 'draft' ? 'planning' : dbStatus,
      priority: 'medium',
      progress: record.progress,
      startDate,
      endDate,
      ownerId: owner.userId,
    });
  } else if (record.type === 'activity') {
    // Find parent initiative by title
    if (!record.parent_title) {
      throw new Error('Activities must have a parent_title');
    }

    const parentInitiative = await db
      .select({ id: initiatives.id })
      .from(initiatives)
      .innerJoin(objectives, eq(initiatives.objectiveId, objectives.id))
      .where(
        and(
          eq(initiatives.title, record.parent_title),
          eq(objectives.companyId, userProfile.companyId)
        )
      )
      .limit(1);

    if (parentInitiative.length === 0) {
      throw new Error(`Parent initiative not found: ${record.parent_title}`);
    }

    await db.insert(activities).values({
      initiativeId: parentInitiative[0].id,
      title: record.title,
      description: record.description,
      status: dbStatus === 'draft' ? 'todo' : dbStatus === 'in_progress' ? 'in_progress' : dbStatus,
      priority: 'medium',
      dueDate: endDate,
      assignedTo: owner.userId,
    });
  } else {
    throw new Error(`Invalid record type: ${record.type}`);
  }
}