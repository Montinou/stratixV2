import { StackServerApp, StackClientApp } from '@stackframe/stack';

// Server-side configuration
export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
});

// Client-side configuration for providers
export const stackClientApp = new StackClientApp({
  tokenStore: 'nextjs-cookie',
});