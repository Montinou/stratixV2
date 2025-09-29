import { StackServerApp, StackClientApp } from '@stackframe/stack';

// Validate environment variables
const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
const secretServerKey = process.env.STACK_SECRET_SERVER_KEY;

if (!projectId) {
  console.error('Missing NEXT_PUBLIC_STACK_PROJECT_ID environment variable');
}
if (!publishableClientKey) {
  console.error('Missing NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY environment variable');
}
if (!secretServerKey) {
  console.error('Missing STACK_SECRET_SERVER_KEY environment variable');
}

// Server-side configuration
export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    afterSignIn: '/tools',
    afterSignUp: '/tools',
  },
  ...(projectId && { projectId }),
  ...(publishableClientKey && { publishableClientKey }),
  ...(secretServerKey && { secretServerKey }),
});

// Client-side configuration for providers
export const stackClientApp = new StackClientApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    afterSignIn: '/tools',
    afterSignUp: '/tools',
  },
  ...(projectId && { projectId }),
  ...(publishableClientKey && { publishableClientKey }),
});