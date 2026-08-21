import type {ReactNode} from "react";

import {AuthFrame} from "@/components/auth/auth-frame";
import {AuthRouteBoundary} from "@/components/auth/auth-session";
import {RouteTransition} from "@/components/layout/route-transition";

export default function AuthLayout({children}: {children: ReactNode}) {
  return (
    <AuthFrame>
      <AuthRouteBoundary>
        <RouteTransition>{children}</RouteTransition>
      </AuthRouteBoundary>
    </AuthFrame>
  );
}
