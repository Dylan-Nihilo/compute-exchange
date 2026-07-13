import type {Metadata} from "next";
import {Suspense} from "react";

import {AccessBoundary} from "@/components/auth/access-boundary";
import {VerificationForm} from "@/components/auth/verification-form";
import {LoadingState} from "@/components/system/operation-state";

export const metadata: Metadata = {title: "账户认证"};

export default function VerifyPage() {
  return (
    <AccessBoundary>
      <Suspense fallback={<LoadingState label="正在加载认证信息" />}>
        <VerificationForm />
      </Suspense>
    </AccessBoundary>
  );
}
