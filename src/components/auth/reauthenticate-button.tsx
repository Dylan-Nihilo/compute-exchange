"use client";

import {Button, Spinner} from "@heroui/react";
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
      {logoutMutation.isPending ? (
        <>
          <Spinner aria-hidden="true" color="current" size="sm" />
          正在退出
        </>
      ) : (
        "切换账户"
      )}
    </Button>
  );
}
