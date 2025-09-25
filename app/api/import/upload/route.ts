import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_FILE_TYPES = ['xlsx', 'csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_DIR = '/tmp/okr-imports'; // Use /tmp for serverless compatibility

/**
 * POST /api/import/upload - Upload file for import processing
 * 
 * Accepts multipart form data with:
 * - file: File (xlsx or csv, max 10MB)
 * - userId: string (required) - Current user ID
 * - userRole: string (required) - User role (empleado, gerente, corporativo)
 * - userDepartment: string (required) - User department
 * 
 * Returns:
 * - fileId: string - Unique identifier for the uploaded file
 * - fileName: string - Original file name
 * - fileSize: number - File size in bytes
 * - fileType: 'xlsx' | 'csv' - Detected file type
 * - uploadedAt: string - ISO timestamp
 */
export async function POST(request: NextRequest) {
  try {
    // Check if request is multipart/form-data
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const userRole = formData.get('userRole') as string;
    const userDepartment = formData.get('userDepartment') as string;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!userId || !userRole || !userDepartment) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, userRole, userDepartment' },
        { status: 400 }
      );
    }

    // Validate user role
    if (!['empleado', 'gerente', 'corporativo'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Invalid userRole. Must be one of: empleado, gerente, corporativo' },
        { status: 400 }
      );
    }

    // Check import permissions - only corporativo and gerente can import
    if (!['corporativo', 'gerente'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Access denied. Only Corporativo and Gerente roles can import data' },
        { status: 403 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Empty file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !ALLOWED_FILE_TYPES.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Invalid file type. Only ${ALLOWED_FILE_TYPES.join(', ')} files are allowed` },
        { status: 400 }
      );
    }

    // Generate unique file ID
    const fileId = randomUUID();
    const tempFileName = `${fileId}.${fileExtension}`;
    const tempFilePath = join(UPLOAD_DIR, tempFileName);

    try {
      // Create upload directory if it doesn't exist (for local development)
      try {
        const { mkdir } = await import('fs/promises');
        await mkdir(UPLOAD_DIR, { recursive: true });
      } catch (error) {
        // Ignore error if directory already exists or we're in serverless
      }

      // Convert file to buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      await writeFile(tempFilePath, buffer);

      // Validate file integrity by attempting to read first few bytes
      const { readFile } = await import('fs/promises');
      const fileHeader = await readFile(tempFilePath, { encoding: null, flag: 'r' });
      
      if (fileExtension === 'xlsx') {
        // Check for ZIP signature (XLSX files are ZIP archives)
        if (fileHeader[0] !== 0x50 || fileHeader[1] !== 0x4B) {
          await unlink(tempFilePath); // Clean up
          return NextResponse.json(
            { error: 'Invalid XLSX file format' },
            { status: 400 }
          );
        }
      } else if (fileExtension === 'csv') {
        // Basic CSV validation - check if file starts with printable characters
        const firstByte = fileHeader[0];
        if (firstByte < 32 && firstByte !== 9 && firstByte !== 10 && firstByte !== 13) {
          await unlink(tempFilePath); // Clean up
          return NextResponse.json(
            { error: 'Invalid CSV file format' },
            { status: 400 }
          );
        }
      }

      // Set cleanup timeout (15 minutes) for temporary files
      setTimeout(async () => {
        try {
          await unlink(tempFilePath);
        } catch (error) {
          console.warn(`Failed to clean up temporary file ${tempFilePath}:`, error);
        }
      }, 15 * 60 * 1000);

      const response = {
        fileId,
        fileName,
        fileSize: file.size,
        fileType: fileExtension as 'xlsx' | 'csv',
        uploadedAt: new Date().toISOString(),
        tempFilePath, // Internal use only
      };

      return NextResponse.json({ data: response }, { status: 200 });

    } catch (fileError) {
      console.error('Error saving uploaded file:', fileError);
      
      // Try to clean up if file was partially written
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('Failed to clean up partial file:', cleanupError);
      }

      return NextResponse.json(
        { error: 'Failed to save uploaded file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing file upload:', error);
    return NextResponse.json(
      { error: 'Internal server error during file upload' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/import/upload - Get upload requirements and limits
 * 
 * Returns configuration information for file uploads
 */
export async function GET() {
  return NextResponse.json({
    data: {
      allowedFileTypes: ALLOWED_FILE_TYPES,
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeMB: Math.round(MAX_FILE_SIZE / (1024 * 1024)),
      requiredFields: ['file', 'userId', 'userRole', 'userDepartment'],
      allowedRoles: ['corporativo', 'gerente'],
    }
  });
}