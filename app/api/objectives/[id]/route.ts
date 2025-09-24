import { NextRequest, NextResponse } from 'next/server';
import { ObjectivesService } from '@/lib/database/services';
import { neonServerClient } from '@/lib/neon-auth/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get the objective
    const objective = await ObjectivesService.getById(params.id, user.id);
    
    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    return NextResponse.json({ objective });
  } catch (error) {
    console.error('Error fetching objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get the existing objective to check ownership
    const existingObjective = await ObjectivesService.getById(params.id, user.id);
    
    if (!existingObjective || existingObjective.owner_id !== user.id) {
      return NextResponse.json({ error: 'Objective not found or unauthorized' }, { status: 404 });
    }

    const body = await request.json();
    
    // Update the objective
    const objective = await ObjectivesService.update(params.id, body);

    return NextResponse.json({ objective });
  } catch (error) {
    console.error('Error updating objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get the existing objective to check ownership
    const existingObjective = await ObjectivesService.getById(params.id, user.id);
    
    if (!existingObjective || existingObjective.owner_id !== user.id) {
      return NextResponse.json({ error: 'Objective not found or unauthorized' }, { status: 404 });
    }
    
    // Delete the objective
    await ObjectivesService.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting objective:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}