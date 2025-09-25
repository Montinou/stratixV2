import { StackServerApp } from "@stackframe/stack"

export function createNeonServerClient() {
  // Check if we're in build time or missing environment variables
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  const secretKey = process.env.STACK_SECRET_SERVER_KEY
  const publishableKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY

  // During build time or when env vars are missing, return a stub
  if (!projectId || !secretKey || !publishableKey) {
    console.warn('Stack Auth environment variables not available, using stub client')
    return {
      getUser: async () => null,
      getProject: async () => null
    } as any
  }

  try {
    return new StackServerApp({
      projectId,
      secretServerKey: secretKey,
      publishableClientKey: publishableKey,
    })
  } catch (error) {
    console.error('Error creating Stack server client:', error)
    return {
      getUser: async () => null,
      getProject: async () => null
    } as any
  }
}

export const neonServerClient = createNeonServerClient()