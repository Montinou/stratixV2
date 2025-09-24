import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/database/auth';
import { CompaniesRepository } from '@/lib/database/queries/companies';
import { DatabaseError, DatabaseErrorCode } from '@/lib/errors/database-errors';
import { z } from 'zod';

const companiesRepository = new CompaniesRepository();

// Validation schema for company updates
const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
});

/**
 * GET /api/companies/[id]
 * Get a specific company by ID
 * Optionally include statistics with ?withStats=true
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Validate ID format (basic UUID check)
    if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Check if stats are requested
    const { searchParams } = new URL(request.url);
    const withStats = searchParams.get('withStats') === 'true';

    let company;
    if (withStats) {
      company = await companiesRepository.getByIdWithStats(id);
    } else {
      company = await companiesRepository.getById(id);
    }

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: company,
      message: 'Company retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching company by ID:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/companies/[id]
 * Update a specific company
 * Requires proper authorization (admin or company owner)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Check if company exists
    const existingCompany = await companiesRepository.getById(id);
    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateCompanySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid company data',
          details: validation.error.issues
        },
        { status: 400 }
      );
    }

    // Check for name uniqueness if name is being updated
    if (validation.data.name && validation.data.name !== existingCompany.name) {
      const companyWithSameName = await companiesRepository.getByName(validation.data.name);
      if (companyWithSameName && companyWithSameName.id !== id) {
        return NextResponse.json(
          { success: false, error: 'Company name already exists' },
          { status: 409 }
        );
      }
    }

    // Update the company
    const updatedCompany = await companiesRepository.update(id, validation.data);

    return NextResponse.json({
      success: true,
      data: updatedCompany,
      message: 'Company updated successfully'
    });

  } catch (error) {
    console.error('Error updating company:', error);
    
    if (error instanceof DatabaseError) {
      switch (error.code) {
        case DatabaseErrorCode.UNIQUE_VIOLATION:
          return NextResponse.json(
            { success: false, error: 'Company name already exists' },
            { status: 409 }
          );
        case DatabaseErrorCode.FOREIGN_KEY_VIOLATION:
          return NextResponse.json(
            { success: false, error: 'Invalid company reference' },
            { status: 400 }
          );
        case DatabaseErrorCode.NOT_NULL_VIOLATION:
          return NextResponse.json(
            { success: false, error: 'Required field missing' },
            { status: 400 }
          );
        default:
          return NextResponse.json(
            { success: false, error: 'Database error occurred' },
            { status: 500 }
          );
      }
    }

    // Handle legacy string-based errors for backward compatibility
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'Company not found' },
          { status: 404 }
        );
      }
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          { success: false, error: 'Company name already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/[id]
 * Delete a specific company
 * Requires proper authorization (admin only)
 * Warning: This will cascade delete all profiles and related data
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const { user, error } = await verifyAuthentication(request);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return NextResponse.json(
        { success: false, error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // Check if company exists
    const existingCompany = await companiesRepository.getById(id);
    if (!existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if company has associated profiles (safety check)
    const companyWithStats = await companiesRepository.getByIdWithStats(id);
    if (companyWithStats && companyWithStats.profilesCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete company: ${companyWithStats.profilesCount} users are still associated with this company` 
        },
        { status: 400 }
      );
    }

    // Delete the company
    await companiesRepository.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting company:', error);
    
    if (error instanceof DatabaseError) {
      switch (error.code) {
        case DatabaseErrorCode.FOREIGN_KEY_VIOLATION:
          return NextResponse.json(
            { success: false, error: 'Cannot delete company: it has associated users or data' },
            { status: 400 }
          );
        case DatabaseErrorCode.CONSTRAINT_VIOLATION:
          return NextResponse.json(
            { success: false, error: 'Cannot delete company: constraint violation' },
            { status: 400 }
          );
        default:
          return NextResponse.json(
            { success: false, error: 'Database error occurred' },
            { status: 500 }
          );
      }
    }

    // Handle legacy string-based errors for backward compatibility
    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete company: it has associated users or data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}