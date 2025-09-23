import { StackClientApp } from "@stackframe/stack"

export function createNeonClient() {
  return new StackClientApp({
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  })
}

export const neonClient = createNeonClient()