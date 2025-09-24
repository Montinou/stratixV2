import { NextRequest, NextResponse } from 'next/server';
import { ProfilesService, CompaniesService } from '@/lib/database/services';
import { neonServerClient } from '@/lib/neon-auth/server';

export async function POST(request: NextRequest) {
  try {
    // Get the user from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Verify the token with Stack
    const token = authHeader.replace('Bearer ', '');
    const user = await neonServerClient.getUser({ accessToken: token });
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, full_name, role_type, department, company_id } = body;

    // Validate the user_id matches the authenticated user
    if (user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the profile
    const profile = await ProfilesService.create({
      id: user_id,
      email: user.primaryEmail || '',
      full_name,
      role: role_type,
      department,
      manager_id: null,
      company_id,
    });

    // Fetch the company if provided
    let company = null;
    if (company_id) {
      company = await CompaniesService.getById(company_id);
    }

    return NextResponse.json({ profile, company });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    const profiles = await ProfilesService.getAll(companyId || undefined);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}