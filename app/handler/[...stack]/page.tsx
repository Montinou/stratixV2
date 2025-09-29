'use client';
import { StackHandler } from '@stackframe/stack';
import { stackClientApp } from '@/stack';

export default function Handler(props: unknown) {
  return <StackHandler fullPage app={stackClientApp} routeProps={props} />;
}
