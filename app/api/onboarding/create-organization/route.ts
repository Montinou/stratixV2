import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import {
  createOrganization,
  generateOrganizationSlug,
  completeOnboardingSession,
  getUserProfile,
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

    // Check if user already has a profile (existing user)
    const existingProfile = await getUserProfile(user.id);
    if (existingProfile && existingProfile.companyId) {
      // User already has an organization, redirect them
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        organization: existingProfile.company,
        profile: existingProfile,
        message: 'You already have an organization'
      });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Organization name and slug are required' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Create organization
    const result = await createOrganization({
      name,
      slug,
      creatorUserId: user.id,
      creatorEmail: user.primaryEmail,
      creatorFullName: user.displayName || undefined,
    });

    // Grant user permission
    await user.grantPermission('user');

    // Complete onboarding session
    await completeOnboardingSession(user.id);

    return NextResponse.json({
      success: true,
      organization: result.organization,
      profile: result.profile,
    });
  } catch (error) {
    console.error('Error creating organization:', error);

    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Organization slug already exists. Please choose a different one.' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create organization' },
      { status: 500 }
    );
  }
}
