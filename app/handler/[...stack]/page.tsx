import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack/server";

export const dynamic = 'force-dynamic'

export default function Handler(props: any) {
  return <StackHandler fullPage app={stackServerApp} routeProps={props} />;
}