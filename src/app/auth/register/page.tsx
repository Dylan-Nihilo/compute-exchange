import type {Metadata} from "next";

import {RegisterForm} from "@/components/auth/register-form";
import {GuestBoundary} from "@/components/auth/guest-boundary";

export const metadata: Metadata = {title: "注册"};

export default function RegisterPage() {
  return (
    <GuestBoundary>
      <RegisterForm />
    </GuestBoundary>
  );
}
