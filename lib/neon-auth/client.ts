import { StackClientApp } from "@stackframe/stack"

export function createNeonClient() {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // Return a stub client for SSR
    return {
      getUser: () => null,
      signOut: async () => {},
      signInWithCredential: async () => { throw new Error('Client auth not available during SSR') },
      signUpWithCredential: async () => { throw new Error('Client auth not available during SSR') }
    } as any
  }

  // Validate environment variables
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const publishableKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY

  if (!projectId || !publishableKey) {
    console.error('Missing Stack Auth environment variables')
    return {
      getUser: () => null,
      signOut: async () => {},
      signInWithCredential: async () => { throw new Error('Stack Auth not configured') },
      signUpWithCredential: async () => { throw new Error('Stack Auth not configured') }
    } as any
  }

  return new StackClientApp({
    projectId,
    publishableClientKey: publishableKey,
  })
}

export const neonClient = createNeonClient()