'use server';

import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack/server';
import db from '@/db';
import { eq, sql } from 'drizzle-orm';
import {
  blacklistedEmailsTable,
  whitelistedDomainsTable,
  whitelistedEmailsTable,
} from '@/db/schema';
import {
  getUserProfile,
  getPendingInvitation,
  createOnboardingSession,
  getOnboardingSession,
} from '@/lib/organization/organization-service';

/**
 * Check if user email is in whitelist (domain or specific email)
 * Returns false if blacklisted
 */
async function checkWhitelist(email: string): Promise<boolean> {
  // Check blacklist first
  const isBlacklisted = await db.query.blacklistedEmailsTable.findFirst({
    where: eq(blacklistedEmailsTable.email, email),
  });

  if (isBlacklisted) {
    return false;
  }

  // Check domain whitelist
  const domain = email.split('@')[1];
  if (domain) {
    const isDomainWhitelisted = await db.query.whitelistedDomainsTable.findFirst({
      where: eq(whitelistedDomainsTable.domain, domain),
    });

    if (isDomainWhitelisted) {
      return true;
    }
  }

  // Check specific email whitelist
  const isEmailWhitelisted = await db.query.whitelistedEmailsTable.findFirst({
    where: eq(whitelistedEmailsTable.email, email),
  });

  return Boolean(isEmailWhitelisted);
}

/**
 * Multi-tenant authentication flow with onboarding state persistence
 *
 * Flow:
 * 1. User has profile → Access granted
 * 2. User has no profile:
 *    a. Check for pending invitation → Redirect to accept
 *    b. No invitation → Allow create own organization
 * 3. Resume onboarding session if interrupted
 *
 * Note: ANY verified user can create an organization
 * Organization owners manage their own member invitations
 */
export async function ensureAuthenticated() {
  console.log('ensureAuthenticated: Getting user...');
  const user = await stackServerApp.getUser({ or: 'redirect' });
  console.log('ensureAuthenticated: User found:', user.primaryEmail);

  // Verify email is verified
  const isVerified = await user.primaryEmailVerified;
  const primaryEmail = user.primaryEmail;
  if (!primaryEmail || !isVerified) {
    console.log('ensureAuthenticated: Email not verified');
    redirect(stackServerApp.urls.emailVerification);
  }

  // ========================================
  // 1. Check if user has profile (completed onboarding)
  // ========================================
  const profile = await getUserProfile(user.id);

  if (profile) {
    console.log('ensureAuthenticated: Profile exists, access granted');
    return { user, profile };
  }

  console.log('ensureAuthenticated: No profile found, checking onboarding state...');

  // ========================================
  // 2. Check for existing onboarding session
  // ========================================
  let onboardingSession = await getOnboardingSession(user.id);

  if (onboardingSession) {
    console.log('ensureAuthenticated: Resuming onboarding session:', onboardingSession.currentStep);

    // Update last activity
    await db.execute(sql`
      UPDATE onboarding_sessions
      SET last_activity = now()
      WHERE user_id = ${user.id}
    `);

    // Resume based on current step and status
    switch (onboardingSession.status) {
      case 'in_progress':
        if (onboardingSession.currentStep === 'accept_invite' && onboardingSession.invitationToken) {
          redirect(`/invite/${onboardingSession.invitationToken}`);
        } else if (onboardingSession.currentStep === 'create_org') {
          redirect('/onboarding/create');
        } else {
          redirect('/onboarding/complete');
        }
        break;

      case 'completed':
        // Strange: session complete but no profile
        // Delete session and start fresh
        console.log('ensureAuthenticated: Session marked complete but no profile, restarting...');
        await db.execute(sql`
          DELETE FROM onboarding_sessions WHERE user_id = ${user.id}
        `);
        onboardingSession = null;
        break;

      case 'abandoned':
        // Reactivate session
        console.log('ensureAuthenticated: Reactivating abandoned session');
        await db.execute(sql`
          UPDATE onboarding_sessions
          SET status = 'in_progress', last_activity = now()
          WHERE user_id = ${user.id}
        `);

        if (onboardingSession.currentStep === 'accept_invite' && onboardingSession.invitationToken) {
          redirect(`/invite/${onboardingSession.invitationToken}`);
        } else {
          redirect('/onboarding/create');
        }
        break;
    }
  }

  // ========================================
  // 3. No session exists - create new one
  // ========================================
  console.log('ensureAuthenticated: Creating new onboarding session...');

  // Check for pending invitation first
  const pendingInvitation = await getPendingInvitation(primaryEmail);

  if (pendingInvitation) {
    console.log('ensureAuthenticated: Found pending invitation for', pendingInvitation.organizationId);

    // Create session for invitation acceptance
    await createOnboardingSession({
      userId: user.id,
      email: primaryEmail,
      step: 'accept_invite',
      invitationToken: pendingInvitation.token,
    });

    redirect(`/invite/${pendingInvitation.token}`);
  }

  // No invitation → Allow user to create their own organization
  // ANY verified user can create an organization
  console.log('ensureAuthenticated: No invitation, allowing user to create organization');

  // Create session for organization creation
  await createOnboardingSession({
    userId: user.id,
    email: primaryEmail,
    step: 'create_org',
  });

  redirect('/onboarding/create');
}

/**
 * Legacy function - kept for backward compatibility
 * Wraps new ensureAuthenticated() function
 */
export async function ensureToolPermissions() {
  const { user } = await ensureAuthenticated();
  return user;
}

export async function adminToolPermissions() {
  const user = await stackServerApp.getUser({ or: 'redirect' });
  if (!user) {
    redirect('/pending-approval');
  }

  const permission = await user.getPermission('admin');
  return permission;
}
