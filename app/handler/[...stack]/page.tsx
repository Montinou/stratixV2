'use client';
import { StackHandler } from '@stackframe/stack';
import { stackClientApp } from '@/stack/client';
import { useEffect } from 'react';

export default function Handler(props: unknown) {
  useEffect(() => {
    // Ensure the Stack Auth uses the current origin
    if (typeof window !== 'undefined' && stackClientApp) {
      // Update the base URL dynamically based on current location
      const currentOrigin = window.location.origin;
      console.log('Stack Auth Handler - Current Origin:', currentOrigin);
    }
  }, []);

  return <StackHandler fullPage app={stackClientApp} routeProps={props} />;
}
