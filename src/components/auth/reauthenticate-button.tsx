"use client";

import {useRouter} from "next/navigation";

import {useAuthStore} from "@/lib/auth/store";

export function ReauthenticateButton() {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <button
      className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      onClick={() => {
        signOut();
        router.replace("/auth/login");
      }}
      type="button"
    >
      切换账户
    </button>
  );
}
