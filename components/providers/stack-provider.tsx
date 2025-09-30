'use client';

import { StackProvider, StackTheme, StackClientApp } from '@stackframe/stack';
import { ReactNode, useMemo } from 'react';

interface ClientStackProviderProps {
  children: ReactNode;
}

export function ClientStackProvider({ children }: ClientStackProviderProps) {
  const stackClientApp = useMemo(() => {
    // Client-side environment variables validation (only NEXT_PUBLIC_ variables are available)
    const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
    const publishableClientKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

    if (!projectId) {
      console.error('Missing NEXT_PUBLIC_STACK_PROJECT_ID environment variable');
    }
    if (!publishableClientKey) {
      console.error('Missing NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY environment variable');
    }

    return new StackClientApp({
      tokenStore: 'nextjs-cookie',
      urls: {
        afterSignIn: '/tools',
        afterSignUp: '/tools',
        baseUrl: process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined,
      },
      projectId: projectId || '',
      publishableClientKey: publishableClientKey || '',
    });
  }, []);

  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        {children}
      </StackTheme>
    </StackProvider>
  );
}