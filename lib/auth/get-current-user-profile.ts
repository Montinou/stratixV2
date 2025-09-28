import { redirect } from 'next/navigation';
import { stackServerApp } from '@/stack';
import { profilesRepository } from '@/lib/database/queries/profiles';
import type { User } from "@stackframe/stack";
import type { ProfileWithCompany } from '@/lib/database/types';

interface AuthenticatedUserProfile {
  user: User;
  profile: ProfileWithCompany;
}

/**
 * Centralized function to get the current authenticated user and their profile
 * Automatically redirects to sign-in if user is not authenticated or profile doesn't exist
 *
 * Usage:
 * ```tsx
 * export default async function ProtectedPage() {
 *   const { user, profile } = await getCurrentUserProfile();
 *   return <PageContent user={user} profile={profile} />;
 * }
 * ```
 */
export async function getCurrentUserProfile(): Promise<AuthenticatedUserProfile> {
  try {
    // Get authenticated user from Stack Auth
    const user = await stackServerApp.getUser();
    if (!user) {
      redirect("/handler/sign-in");
    }

    // Get user profile from database
    const profile = await profilesRepository.getByUserId(user.id);
    if (!profile) {
      // User exists in Stack Auth but no profile in database
      // This could happen during onboarding process
      redirect("/onboarding/complete");
    }

    return {
      user,
      profile
    };

  } catch (error) {
    console.error('Error getting current user profile:', error);
    redirect("/handler/sign-in");
  }
}

/**
 * Alternative function that returns null instead of redirecting
 * Useful for API routes or when you need to handle the error manually
 */
export async function tryGetCurrentUserProfile(): Promise<AuthenticatedUserProfile | null> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      return null;
    }

    const profile = await profilesRepository.getByUserId(user.id);
    if (!profile) {
      return null;
    }

    return {
      user,
      profile
    };

  } catch (error) {
    console.error('Error trying to get current user profile:', error);
    return null;
  }
}

/**
 * Get only the authenticated user (without profile)
 * Redirects to sign-in if not authenticated
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const user = await stackServerApp.getUser();
    if (!user) {
      redirect("/handler/sign-in");
    }
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    redirect("/handler/sign-in");
  }
}

/**
 * Check if user has specific role
 * Useful for role-based access control
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthenticatedUserProfile> {
  const { user, profile } = await getCurrentUserProfile();

  if (!allowedRoles.includes(profile.roleType)) {
    redirect("/dashboard"); // or appropriate unauthorized page
  }

  return { user, profile };
}

/**
 * Check if user is admin (corporativo role)
 */
export async function requireAdmin(): Promise<AuthenticatedUserProfile> {
  return requireRole(['corporativo']);
}