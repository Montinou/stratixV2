import { StackServerApp, StackClientApp } from "@stackframe/stack";

// 2025 configuration - let Stack Auth auto-configure from environment variables
export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
});

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie", 
});