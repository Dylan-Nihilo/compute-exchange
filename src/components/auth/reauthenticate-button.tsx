"use client";

import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";

import {useLogout} from "@/lib/auth/queries";

export function ReauthenticateButton() {
  const router = useRouter();
  const logoutMutation = useLogout();

  return (
    <Button
      onPress={() => {
        logoutMutation.mutate(undefined, {
          onSettled: () => router.replace("/auth/login"),
        });
      }}
      isPending={logoutMutation.isPending}
      type="button"
      variant="outline"
    >
      切换账户
    </Button>
  );
}
