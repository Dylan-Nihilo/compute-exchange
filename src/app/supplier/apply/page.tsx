import type {Metadata} from "next";

import {AccessBoundary} from "@/components/auth/access-boundary";
import {AuthFrame} from "@/components/auth/auth-frame";
import {AuthRouteBoundary} from "@/components/auth/auth-session";
import {IdentityForm} from "@/components/auth/identity-form";

export const metadata: Metadata = {title: "成为供给方"};

export default function SupplierApplicationPage() {
  return (
    <AuthFrame>
      <AuthRouteBoundary>
        <AccessBoundary>
          <IdentityForm />
        </AccessBoundary>
      </AuthRouteBoundary>
    </AuthFrame>
  );
}
