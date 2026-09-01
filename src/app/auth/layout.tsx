import type {ReactNode} from "react";

import {AuthFrame} from "@/components/auth/auth-frame";
import {AuthRouteBoundary} from "@/components/auth/auth-session";

export default function AuthLayout({children}: {children: ReactNode}) {
  return (
    <AuthFrame>
      <AuthRouteBoundary>{children}</AuthRouteBoundary>
    </AuthFrame>
  );
}
