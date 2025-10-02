import { NextRequest, NextResponse } from 'next/server';
import { getInvitation } from '@/lib/organization/organization-service';
import { stackServerApp } from '@/stack/server';

interface RouteParams {
  params: {
    token: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { token } = params;

    // Get user if authenticated, otherwise use a system context
    // This endpoint needs to work for non-authenticated users viewing invitation
    const user = await stackServerApp.getUser();
    const userId = user?.id || 'system'; // Use 'system' for unauthenticated access

    const invitation = await getInvitation(userId, token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('Error al obtener invitación:', error);
    return NextResponse.json(
      { error: 'Error al obtener la invitación' },
      { status: 500 }
    );
  }
}
