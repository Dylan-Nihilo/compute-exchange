"use client";

import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";

import {useAuthStore} from "@/lib/auth/store";

export function ReauthenticateButton() {
  const router = useRouter();
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <Button
      onPress={() => {
        signOut();
        router.replace("/auth/login");
      }}
      type="button"
      variant="outline"
    >
      切换账户
    </Button>
  );
}
