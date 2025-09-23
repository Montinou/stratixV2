import { StackServerApp } from "@stackframe/stack"

/**
 * Create NeonAuth (Stack) server client.
 * This maintains compatibility with the existing createClient interface
 * while using NeonAuth under the hood.
 * 
 * Note: This will be fully migrated in Task #7 (Database Client Migration)
 */
export async function createClient() {
  // For now, return a NeonAuth server client that provides similar interface
  const stackServerApp = new StackServerApp({
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
    secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  })

  // TODO: Task #7 will implement proper database client interface
  // For now, this minimal wrapper maintains compatibility
  return {
    // Placeholder methods that will be implemented in Task #7
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
    auth: {
      getUser: async () => {
        try {
          const user = await stackServerApp.getUser()
          return { data: { user }, error: null }
        } catch (error) {
          return { data: { user: null }, error }
        }
      }
    }
  }
}
