import type {Metadata} from "next";

import {AccessBoundary} from "@/components/auth/access-boundary";
import {IdentityForm} from "@/components/auth/identity-form";

export const metadata: Metadata = {title: "身份管理"};

export default function IdentityPage() {
  return (
    <AccessBoundary>
      <IdentityForm />
    </AccessBoundary>
  );
}
