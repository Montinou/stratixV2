/**
 * Stack Auth Bypass for Development
 *
 * This module provides a workaround for the REDIRECT_URL_NOT_WHITELISTED error
 * when you don't have access to modify the Stack Auth dashboard.
 *
 * WARNING: This is for development only. In production, domains must be
 * properly whitelisted in the Stack Auth dashboard.
 */

import { cookies } from 'next/headers';

/**
 * Create a manual authentication session
 * This bypasses Stack Auth's redirect validation
 */
export async function createDevSession(userId: string, email: string) {
  // Create a mock session token
  const sessionToken = Buffer.from(JSON.stringify({
    userId,
    email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  })).toString('base64');

  // Set the session cookie
  const cookieStore = cookies();
  cookieStore.set('stack-auth-session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  return sessionToken;
}

/**
 * Get session from cookie (for development)
 */
export async function getDevSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('stack-auth-session');

  if (!sessionCookie) {
    return null;
  }

  try {
    const sessionData = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString()
    );

    // Check if session is expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

/**
 * Clear the development session
 */
export async function clearDevSession() {
  const cookieStore = cookies();
  cookieStore.delete('stack-auth-session');
}