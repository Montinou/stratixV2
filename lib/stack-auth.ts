/**
 * Safe wrapper for Stack Auth (Neon Native Auth) operations
 * Handles cases where Stack Auth might fail or not be properly configured
 */

import { stackServerApp } from '@/stack/server';
import { redirect } from 'next/navigation';

export interface SafeUser {
  id: string;
  primaryEmail?: string | null;
  displayName?: string | null;
}

/**
 * Safely get the current user from Stack Auth
 * Returns null if authentication fails or Stack Auth is not configured
 */
export async function getSafeUser(): Promise<SafeUser | null> {
  try {
    // Check if stackServerApp is properly initialized
    if (!stackServerApp) {
      console.error('Stack Auth is not initialized');
      return null;
    }

    // Try to get the user
    const user = await stackServerApp.getUser();

    if (!user || !user.id) {
      return null;
    }

    return {
      id: user.id,
      primaryEmail: user.primaryEmail,
      displayName: user.displayName,
    };
  } catch (error) {
    console.error('Error getting user from Stack Auth:', error);
    return null;
  }
}

/**
 * Get user or redirect to login
 * Safe wrapper that handles Stack Auth failures
 */
export async function getUserOrRedirect(): Promise<SafeUser> {
  try {
    const user = await getSafeUser();

    if (!user) {
      redirect('/handler/sign-in');
    }

    return user;
  } catch (error) {
    console.error('Error in getUserOrRedirect:', error);
    redirect('/handler/sign-in');
  }
}

/**
 * Check if Stack Auth is properly configured
 */
export function isStackAuthConfigured(): boolean {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
  const secretServerKey = process.env.STACK_SECRET_SERVER_KEY;

  return Boolean(projectId && publishableClientKey && secretServerKey);
}