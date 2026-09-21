"use client";

import {Button, Spinner} from "@heroui/react";

import {useLogout} from "@/lib/auth/queries";

export function ReauthenticateButton() {
  const logoutMutation = useLogout();

  return (
    <Button
      onPress={() => {
        logoutMutation.mutate(undefined, {
          // 身份切换必须硬导航: 丢弃客户端路由缓存(见 workspace-shell logout)。
          onSettled: () => window.location.replace("/auth/login"),
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
