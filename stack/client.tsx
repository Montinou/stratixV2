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

// Client-side configuration for providers
export const stackClientApp = new StackClientApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    afterSignIn: '/tools',
    afterSignUp: '/tools',
  },
  projectId: projectId || '',
  publishableClientKey: publishableClientKey || '',
});