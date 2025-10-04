'use client';

import { StackClientApp } from '@stackframe/stack';

// Client-side environment variables validation (only NEXT_PUBLIC_ variables are available)
const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

if (!projectId) {
  console.error('Missing NEXT_PUBLIC_STACK_PROJECT_ID environment variable');
}
if (!publishableClientKey) {
  console.error('Missing NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY environment variable');
}

// Determine base URL for the application - use dynamic detection
const getBaseUrl = () => {
  // Always use window location in browser for maximum flexibility
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Check for explicit URL configuration for SSR
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }

  // Production fallback
  return 'https://www.ai-innovation.site';
};

// Client-side configuration for providers
export const stackClientApp = new StackClientApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    afterSignIn: '/tools/okr',
    afterSignUp: '/tools/okr',
    baseUrl: getBaseUrl(),
  },
  projectId: projectId || '',
  publishableClientKey: publishableClientKey || '',
  // Enable automatic sign-in for existing users
  emailConfig: {
    type: 'standard',
  },
});