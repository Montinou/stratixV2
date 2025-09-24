import { NextRequest, NextResponse } from 'next/server';
import { ObjectivesService } from '@/lib/database/services';
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

    // Get user's profile to determine role and department
    const profileResponse = await fetch(`${request.nextUrl.origin}/api/profiles/me`, {
      headers: { authorization: authHeader }
    });

    if (!profileResponse.ok) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { profile } = await profileResponse.json();
    
    // Get objectives based on user role
    const objectives = await ObjectivesService.getAll(user.id, profile.role, profile.department);
    
    return NextResponse.json({ objectives });
  } catch (error) {
    console.error('Error fetching objectives:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    
    // Validate the owner_id matches the authenticated user
    if (body.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the objective
    const objective = await ObjectivesService.create(body);

    return NextResponse.json({ objective });
  } catch (error) {
    console.error('Error creating objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}