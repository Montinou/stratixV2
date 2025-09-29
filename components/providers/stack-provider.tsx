'use client';

import { StackProvider, StackTheme } from '@stackframe/stack';
import stackApp from '@/stack/client';

export function StackAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <StackProvider app={stackApp}>
      <StackTheme>
        {children}
      </StackTheme>
    </StackProvider>
  );
}