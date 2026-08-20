import type {ReactNode} from "react";

import {AuthFrame} from "@/components/auth/auth-frame";
import {RouteTransition} from "@/components/layout/route-transition";

export default function AuthLayout({children}: {children: ReactNode}) {
  return (
    <AuthFrame>
      <RouteTransition>{children}</RouteTransition>
    </AuthFrame>
  );
}
