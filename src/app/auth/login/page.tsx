import type {Metadata} from "next";
import {Suspense} from "react";

import {LoginForm} from "@/components/auth/login-form";
import {GuestBoundary} from "@/components/auth/guest-boundary";
import {LoadingState} from "@/components/system/operation-state";

export const metadata: Metadata = {title: "登录"};

export default function LoginPage() {
  return (
    <GuestBoundary>
      <Suspense fallback={<LoadingState label="正在加载登录页" />}>
        <LoginForm />
      </Suspense>
    </GuestBoundary>
  );
}
