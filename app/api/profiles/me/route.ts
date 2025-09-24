import { NextRequest, NextResponse } from 'next/server';
import { ProfilesService, CompaniesService } from '@/lib/database/services';
import { neonServerClient } from '@/lib/neon-auth/server';

export async function GET(request: NextRequest) {
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

    // Get the user's profile
    const profile = await ProfilesService.getByUserId(user.id);
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the user's company if they have one
    let company = null;
    if (profile.company_id) {
      company = await CompaniesService.getById(profile.company_id);
    }

    return NextResponse.json({ profile, company });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    
    // Update the user's profile
    const profile = await ProfilesService.update(user.id, body);

    // Get the user's company if they have one
    let company = null;
    if (profile.company_id) {
      company = await CompaniesService.getById(profile.company_id);
    }

    return NextResponse.json({ profile, company });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}