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
    process.env.NEXT_PHASE === 'phase-export'
  );
}

// Standard Stack Auth initialization following Neon's recommended approach
function createStackServerApp(): StackServerApp {
  // Only skip initialization during actual Next.js build phases
  if (isBuildTime()) {
    console.log('Stack Auth: Skipping server initialization during build phase')
    return {} as StackServerApp;
  }

  try {
    validateEnvironmentVariables();

    const serverApp = new StackServerApp({
      tokenStore: "nextjs-cookie",
      projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
      publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
      secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
    });

    console.log('Stack Auth: Server app initialized successfully')
    return serverApp;
  } catch (error) {
    console.error('Stack Auth: Failed to initialize server app:', error)
    throw error;
  }
}

// Export only the server app - client app is created dynamically in components
export const stackServerApp = createStackServerApp();