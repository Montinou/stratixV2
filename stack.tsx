import { StackServerApp, StackClientApp } from '@stackframe/stack';

// Server-side configuration
export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    afterSignIn: '/tools',
    afterSignUp: '/tools',
  },
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
});

// Client-side configuration for providers
export const stackClientApp = new StackClientApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    afterSignIn: '/tools',
    afterSignUp: '/tools',
  },
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
});