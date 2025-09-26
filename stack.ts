import { StackServerApp, StackClientApp } from "@stackframe/stack";

// Environment variable validation
function validateEnvironmentVariables() {
  const requiredClientVars = [
    'NEXT_PUBLIC_STACK_PROJECT_ID',
    'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
  ];

  const requiredServerVars = [
    'STACK_SECRET_SERVER_KEY',
  ];

  // Validate client variables (always required)
  const missingClientVars = requiredClientVars.filter(varName => !process.env[varName]);
  if (missingClientVars.length > 0) {
    throw new Error(`Missing required Stack Auth environment variables: ${missingClientVars.join(', ')}`);
  }

  // Validate server variables (only on server)
  if (typeof window === 'undefined') {
    const missingServerVars = requiredServerVars.filter(varName => !process.env[varName]);
    if (missingServerVars.length > 0) {
      throw new Error(`Missing required Stack Auth server environment variables: ${missingServerVars.join(', ')}`);
    }
  }
}

// Check if we're in a build environment where Stack Auth shouldn't initialize
function isBuildTime(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-export' ||
    (typeof window === 'undefined' &&
     process.env.NODE_ENV === 'production' &&
     (process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === 'production') &&
     !process.env.VERCEL_URL)
  );
}

// Standard Stack Auth initialization following Neon's recommended approach
function createStackServerApp(): StackServerApp {
  if (isBuildTime()) {
    // Return a mock object during build to prevent initialization
    return {} as StackServerApp;
  }

  validateEnvironmentVariables();

  return new StackServerApp({
    tokenStore: "nextjs-cookie",
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
    secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  });
}

function createStackClientApp(): StackClientApp {
  if (isBuildTime()) {
    // Return a mock object during build to prevent initialization
    return {} as StackClientApp;
  }

  validateEnvironmentVariables();

  return new StackClientApp({
    tokenStore: "nextjs-cookie",
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  });
}

// Export the Stack Auth instances using standard initialization
export const stackServerApp = createStackServerApp();
export const stackClientApp = createStackClientApp();