"use client";

import {usePathname} from "next/navigation";
import {useEffect} from "react";

import {LoadingState} from "@/components/system/operation-state";
import {useCurrentAccount} from "@/lib/auth/queries";
import {resolvePostAuthDestination, safeNextPath} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";

const guestOnlyRoutes = new Set(["/auth/login", "/auth/register"]);

export function AuthSessionBootstrap() {
  useCurrentAccount();
  return null;
}

export function AuthRouteBoundary({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const selectRole = useAuthStore((state) => state.selectRole);
  const accountQuery = useCurrentAccount();
  const isGuestOnly = guestOnlyRoutes.has(pathname);

  useEffect(() => {
    if (!isGuestOnly || !hasHydrated || !accountQuery.data) return;

    const nextPath = safeNextPath(
      new URLSearchParams(window.location.search).get("next"),
    );
    const destination = resolvePostAuthDestination(accountQuery.data, nextPath);
    selectRole(destination.role, accountQuery.data.roles);
    // 身份切换必须硬导航: 客户端路由缓存里可能留有匿名时预取的 middleware 重定向
    // (软导航会被弹回登录页, 停在「正在读取账户」原地打转), 见 login-form。
    window.location.replace(destination.path);
  }, [
    accountQuery.data,
    hasHydrated,
    isGuestOnly,
    selectRole,
  ]);

  if (
    isGuestOnly &&
    (!hasHydrated || accountQuery.isPending || Boolean(accountQuery.data))
  ) {
    return <LoadingState label="正在读取账户" />;
  }

  return children;
}
