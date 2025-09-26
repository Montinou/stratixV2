import { StackHandler } from "@stackframe/stack";
import { stackClientApp } from "@/stack";

export const dynamic = 'force-dynamic'

export default function Handler(props: any) {
  return <StackHandler fullPage app={stackClientApp} {...props} />;
}