import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import {
  acceptInvitation,
  completeOnboardingSession,
} from '@/lib/organization/organization-service';

export async function POST(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user || !user.primaryEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Accept invitation
    const result = await acceptInvitation({
      token,
      userId: user.id,
      fullName: user.displayName || undefined,
    });

    // Grant user permission
    await user.grantPermission('user');

    // Complete onboarding session
    await completeOnboardingSession(user.id);

    return NextResponse.json({
      success: true,
      company: result.company,
      profile: result.profile,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
