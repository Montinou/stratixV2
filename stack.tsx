import { StackServerApp, StackClientApp } from '@stackframe/stack';

// Server-side configuration
export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    signIn: '/handler/sign-in',
    signUp: '/handler/sign-up',
    afterSignIn: '/tools',
    afterSignUp: '/tools',
    home: '/',
  },
});

// Client-side configuration for providers
export const stackClientApp = new StackClientApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    signIn: '/handler/sign-in',
    signUp: '/handler/sign-up',
    afterSignIn: '/tools',
    afterSignUp: '/tools',
    home: '/',
  },
});