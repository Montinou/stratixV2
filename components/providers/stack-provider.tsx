'use client';

import { StackProvider, StackTheme } from '@stackframe/stack';
import { stackClientApp } from '@/stack/client';
import { ReactNode } from 'react';

interface ClientStackProviderProps {
  children: ReactNode;
}

export function ClientStackProvider({ children }: ClientStackProviderProps) {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        {children}
      </StackTheme>
    </StackProvider>
  );
}