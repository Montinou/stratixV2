import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { updateOnboardingDraft } from '@/lib/organization/organization-service';

export async function PUT(request: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    await updateOnboardingDraft(user.id, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving draft:', error);
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    );
  }
}
