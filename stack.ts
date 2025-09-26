import { StackServerApp, StackClientApp } from "@stackframe/stack";

// Lazy initialization to avoid Stack Auth creation during build/prerendering
let _stackServerApp: StackServerApp | null = null;
let _stackClientApp: StackClientApp | null = null;

// 2025 configuration with nextjs-cookie token store
export const stackServerApp = new Proxy({} as StackServerApp, {
  get(_target, prop) {
    if (!_stackServerApp) {
      // Only initialize when actually needed, not during build
      if (typeof window === 'undefined' && process.env.NODE_ENV !== 'development' && !process.env.STACK_SECRET_SERVER_KEY) {
        throw new Error("Stack Auth server app cannot be initialized during build");
      }
      _stackServerApp = new StackServerApp({
        tokenStore: "nextjs-cookie",
        projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
        secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
      });
    }
    return (_stackServerApp as any)[prop];
  }
});

export const stackClientApp = new Proxy({} as StackClientApp, {
  get(_target, prop) {
    if (!_stackClientApp) {
      // Only initialize when actually needed, not during build
      if (typeof window === 'undefined' && process.env.NODE_ENV !== 'development' && !process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY) {
        throw new Error("Stack Auth client app cannot be initialized during build");
      }
      _stackClientApp = new StackClientApp({
        tokenStore: "nextjs-cookie",
        projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
      });
    }
    return (_stackClientApp as any)[prop];
  }
});