import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { getOnboardingSession } from '@/lib/organization/organization-service';

export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const session = await getOnboardingSession(user.id);

    if (!session) {
      return NextResponse.json(
        { error: 'No onboarding session found' },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding status' },
      { status: 500 }
    );
  }
}
