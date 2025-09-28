import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/get-current-user-profile';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser();

    const body = await request.json();
    const { step, data } = body;

    // For now, just log the step data and return success
    console.log(`Onboarding step ${step} data for user ${user.id}:`, data);

    // TODO: Save the step data to database or session storage
    // This could be saved to a user_onboarding_progress table or Redis

    return NextResponse.json({
      success: true,
      message: `Step ${step} saved successfully`,
      step,
      data
    });

  } catch (error) {
    console.error('Error saving onboarding step:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save onboarding step' },
      { status: 500 }
    );
  }
}