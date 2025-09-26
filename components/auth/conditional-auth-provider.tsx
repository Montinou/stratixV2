"use client"

import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/lib/hooks/use-auth'
import React from 'react'

interface ConditionalAuthProviderProps {
  children: React.ReactNode
}

// Routes that should be publicly accessible (no auth required)
const PUBLIC_ROUTES = [
  '/',
  '/handler/sign-in',
  '/handler/sign-up', 
  '/handler/forgot-password',
  '/handler/reset-password',
  '/handler/verify-email'
]

// Routes that start with these paths are also public
const PUBLIC_PATH_PREFIXES = [
  '/handler/'
]

function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true
  }
  
  // Check path prefixes
  return PUBLIC_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export function ConditionalAuthProvider({ children }: ConditionalAuthProviderProps) {
  const pathname = usePathname()
  
  // For public routes, don't wrap with AuthProvider to prevent authentication calls
  if (isPublicRoute(pathname)) {
    return <>{children}</>
  }
  
  // For protected routes, wrap with AuthProvider
  return <AuthProvider>{children}</AuthProvider>
}