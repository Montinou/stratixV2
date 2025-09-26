"use client"

import { usePathname } from 'next/navigation'
import { StackProvider } from '@stackframe/stack'
import { AuthProvider } from '@/lib/hooks/use-auth'
import { stackClientApp } from '@/stack/client'
import React from 'react'

interface ConditionalAuthProviderProps {
  children: React.ReactNode
}

// Routes that should be purely public (no Stack Auth at all)
const PURE_PUBLIC_ROUTES = [
  '/',
]

// Routes that need Stack Auth for authentication but don't need our AuthProvider
const AUTH_HANDLER_ROUTES = [
  '/handler/sign-in',
  '/handler/sign-up', 
  '/handler/forgot-password',
  '/handler/reset-password',
  '/handler/verify-email'
]

// Routes that start with these paths are auth handlers
const AUTH_HANDLER_PREFIXES = [
  '/handler/'
]

function isPurePublicRoute(pathname: string): boolean {
  return PURE_PUBLIC_ROUTES.includes(pathname)
}

function isAuthHandlerRoute(pathname: string): boolean {
  // Check exact matches
  if (AUTH_HANDLER_ROUTES.includes(pathname)) {
    return true
  }
  
  // Check path prefixes
  return AUTH_HANDLER_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function ConditionalAuthProvider({ children }: ConditionalAuthProviderProps) {
  const pathname = usePathname()
  
  // For pure public routes (like landing page), don't wrap with any auth providers
  if (isPurePublicRoute(pathname)) {
    return <>{children}</>
  }
  
  // For auth handler routes, only wrap with StackProvider (no AuthProvider)
  if (isAuthHandlerRoute(pathname)) {
    return (
      <StackProvider app={stackClientApp}>
        {children}
      </StackProvider>
    )
  }
  
  // For protected routes, wrap with both StackProvider and AuthProvider
  return (
    <StackProvider app={stackClientApp}>
      <AuthProvider>{children}</AuthProvider>
    </StackProvider>
  )
}