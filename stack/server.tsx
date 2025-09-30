import { StackServerApp } from '@stackframe/stack';

// Server-side environment variables validation
const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
const secretServerKey = process.env.STACK_SECRET_SERVER_KEY;

// Log environment variable status for debugging
console.log('Stack Auth Server Config - Environment Variables Check:');
console.log('- NEXT_PUBLIC_STACK_PROJECT_ID:', projectId ? 'Present' : 'Missing');
console.log('- NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY:', publishableClientKey ? 'Present' : 'Missing');
console.log('- STACK_SECRET_SERVER_KEY:', secretServerKey ? 'Present' : 'Missing');

if (!projectId || !publishableClientKey || !secretServerKey) {
  console.error('Missing required Stack Auth environment variables');
  console.error('Application will redirect to signup for all requests');
}

// Server-side configuration - use fallbacks to prevent crashes
export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
  urls: {
    afterSignIn: '/tools',
    afterSignUp: '/tools',
    baseUrl: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined,
  },
  projectId: projectId || 'missing',
  publishableClientKey: publishableClientKey || 'missing',
  secretServerKey: secretServerKey || 'missing',
});