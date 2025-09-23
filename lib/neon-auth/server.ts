import { StackServerApp } from "@stackframe/stack"

export function createNeonServerClient() {
  return new StackServerApp({
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  })
}

export const neonServerClient = createNeonServerClient()