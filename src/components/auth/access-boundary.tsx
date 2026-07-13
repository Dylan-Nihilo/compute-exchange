"use client";

import {usePathname, useRouter} from "next/navigation";
import {useEffect, useMemo} from "react";

import {ErrorState, LoadingState} from "@/components/system/operation-state";
import {useCurrentAccount} from "@/lib/auth/queries";
import {resolveActiveRole} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {accessLevelForRoute} from "@/lib/domain/routes";

export function AccessBoundary({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const accountId = useAuthStore((state) => state.accountId);
  const activeRole = useAuthStore((state) => state.activeRole);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const roleSwitchTarget = useAuthStore((state) => state.roleSwitchTarget);
  const selectRole = useAuthStore((state) => state.selectRole);
  const completeRoleSwitch = useAuthStore((state) => state.completeRoleSwitch);
  const signOut = useAuthStore((state) => state.signOut);
  const accountQuery = useCurrentAccount();
  const account = accountQuery.data;

  const authorization = useMemo(() => {
    if (!account) return null;
    const role = resolveActiveRole(account.roles, activeRole);
    const qualificationStatus = ["supplier", "vendor", "funder"].includes(role)
      ? "approved"
      : undefined;
    return {
      role,
      level: accessLevelForRoute(pathname, {
        role,
        verificationStatus: account.verificationStatus,
        qualificationStatus,
        grants: account.grants,
      }),
    } as const;
  }, [account, activeRole, pathname]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accountId) {
      router.replace(
        `/auth/login?next=${encodeURIComponent(currentLocation(pathname))}`,
      );
      return;
    }
    if (accountQuery.isSuccess && !account) {
      signOut();
      router.replace(
        `/auth/login?next=${encodeURIComponent(currentLocation(pathname))}`,
      );
      return;
    }
    if (!account || !authorization) return;

    if (roleSwitchTarget) {
      if (pathname === roleSwitchTarget) {
        completeRoleSwitch();
      } else {
        router.replace(roleSwitchTarget);
      }
      return;
    }

    if (activeRole !== authorization.role) {
      selectRole(authorization.role, account.roles);
    }
    if (authorization.level === "conditional") {
      router.replace(
        `/auth/verify?next=${encodeURIComponent(currentLocation(pathname))}`,
      );
    } else if (authorization.level === "deny") {
      router.replace("/unauthorized");
    }
  }, [
    account,
    accountId,
    accountQuery.isSuccess,
    activeRole,
    authorization,
    completeRoleSwitch,
    hasHydrated,
    pathname,
    router,
    roleSwitchTarget,
    selectRole,
    signOut,
  ]);

  if (!hasHydrated || (accountId && accountQuery.isPending)) {
    return <LoadingState label="正在验证访问权限" />;
  }
  if (accountQuery.isError) {
    return (
      <ErrorState
        description={messageFor(accountQuery.error)}
        onRetry={() => void accountQuery.refetch()}
      />
    );
  }
  if (roleSwitchTarget && pathname !== roleSwitchTarget) {
    return <LoadingState label="正在切换工作台" />;
  }
  if (!account || authorization?.level !== "allow") {
    return <LoadingState label="正在前往可访问页面" />;
  }

  return children;
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "请求未完成，请重新尝试。";
}

function currentLocation(pathname: string) {
  if (typeof window === "undefined") return pathname;
  return `${pathname}${window.location.search}${window.location.hash}`;
}
