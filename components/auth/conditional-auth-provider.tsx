"use client"

import { usePathname } from 'next/navigation'
import { StackProvider, StackTheme } from '@stackframe/stack'
import { AuthProvider } from '@/lib/hooks/use-auth'
import React, { Suspense, useState, useEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

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

// Loading fallback component for auth initialization
function AuthLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )
}

// Error fallback component
function AuthErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  console.error('Auth Error:', error)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Error de Autenticación</h2>
        <p className="text-sm text-gray-600 mb-4">Ha ocurrido un error al inicializar el sistema de autenticación.</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}

// Client-only wrapper for Stack Auth
function ClientOnlyStackProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  const [stackClientApp, setStackClientApp] = useState<any>(null)

  useEffect(() => {
    // Only initialize Stack Auth on client-side
    if (typeof window !== 'undefined') {
      setIsClient(true)

      // Dynamic import and create Stack client app directly in browser
      import('@stackframe/stack').then(({ StackClientApp }) => {
        const clientApp = new StackClientApp({
          tokenStore: "nextjs-cookie",
          projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
          publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
        })
        setStackClientApp(clientApp)
      }).catch((error) => {
        console.error('Failed to load Stack Auth client app:', error)
      })
    }
  }, [])

  // Show loading state until client-side initialization is complete
  if (!isClient || !stackClientApp) {
    return <AuthLoadingFallback />
  }

  return (
    <ErrorBoundary FallbackComponent={AuthErrorFallback}>
      <StackProvider app={stackClientApp}>
        <StackTheme>
          {children}
        </StackTheme>
      </StackProvider>
    </ErrorBoundary>
  )
}

export function ConditionalAuthProvider({ children }: ConditionalAuthProviderProps) {
  const pathname = usePathname()

  // For pure public routes (like landing page), don't wrap with any auth providers
  if (isPurePublicRoute(pathname)) {
    return (
      <Suspense fallback={<AuthLoadingFallback />}>
        {children}
      </Suspense>
    )
  }

  // For auth handler routes, only wrap with StackProvider (no AuthProvider)
  if (isAuthHandlerRoute(pathname)) {
    return (
      <Suspense fallback={<AuthLoadingFallback />}>
        <ClientOnlyStackProvider>
          {children}
        </ClientOnlyStackProvider>
      </Suspense>
    )
  }

  // For protected routes, wrap with both StackProvider and AuthProvider
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <ClientOnlyStackProvider>
        <ErrorBoundary FallbackComponent={AuthErrorFallback}>
          <AuthProvider>{children}</AuthProvider>
        </ErrorBoundary>
      </ClientOnlyStackProvider>
    </Suspense>
  )
}