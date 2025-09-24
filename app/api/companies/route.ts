import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/database/auth';
import { CompaniesRepository } from '@/lib/database/queries/companies';
import type { CreateCompanyForm } from '@/lib/database/types';
import { z } from 'zod';

const companiesRepository = new CompaniesRepository();

// Validation schema for company creation
const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
});

// Validation schema for company updates
const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
});

/**
 * GET /api/companies
 * Get all companies or search/filter companies
 * Supports query parameters: search, industry, size, withStats
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
    const search = searchParams.get('search');
    const industry = searchParams.get('industry');
    const size = searchParams.get('size');
    const withStats = searchParams.get('withStats') === 'true';

    let companies;

    if (search) {
      // Search companies by name
      companies = await companiesRepository.searchByName(search);
    } else if (industry) {
      // Filter by industry
      companies = await companiesRepository.getByIndustry(industry);
    } else if (size) {
      // Filter by size
      companies = await companiesRepository.getBySize(size);
    } else if (withStats) {
      // Get all companies with statistics
      companies = await companiesRepository.getAllWithStats();
    } else {
      // Get all companies (basic)
      companies = await companiesRepository.getAll();
    }

    return NextResponse.json({
      success: true,
      data: companies,
      message: `Retrieved ${companies.length} companies`
    });

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies
 * Create a new company
 * Requires authentication and valid company data
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

    // Parse and validate request body
    const body = await request.json();
    const validation = createCompanySchema.safeParse(body);
    
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

    const { name, description, industry, size } = validation.data;

    // Check if company with same name already exists
    const existingCompany = await companiesRepository.getByName(name);
    if (existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Company with this name already exists' },
        { status: 409 }
      );
    }

    // Create the company
    const newCompany = await companiesRepository.create({
      name,
      description,
      industry,
      size,
    });

    return NextResponse.json({
      success: true,
      data: newCompany,
      message: 'Company created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating company:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
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