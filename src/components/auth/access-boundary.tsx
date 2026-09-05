"use client";

import {usePathname, useRouter} from "next/navigation";
import {useEffect, useMemo} from "react";

import {RouteLoading} from "@/components/layout/route-loading";
import {ErrorState} from "@/components/system/operation-state";
import {useCurrentAccount} from "@/lib/auth/queries";
import {resolveActiveRole} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {accessLevelForRoute} from "@/lib/domain/routes";
import type {Role} from "@/lib/domain/contracts";

export function AccessBoundary({children, role: requiredRole}: {children: React.ReactNode; role?: Exclude<Role, "guest">}) {
  const pathname = usePathname();
  const router = useRouter();
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
    const role = requiredRole && account.roles.includes(requiredRole)
      ? requiredRole
      : resolveActiveRole(account.roles, activeRole);
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
  }, [account, activeRole, pathname, requiredRole]);

  useEffect(() => {
    if (!hasHydrated || !accountQuery.isSuccess) return;
    if (!account) {
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

  if (!hasHydrated || accountQuery.isPending) {
    return <RouteLoading label="正在验证访问权限" />;
  }
  if (accountQuery.isError) {
    return (
      <ErrorState
        description={messageFor(accountQuery.error)}
        isPending={accountQuery.isFetching}
        onRetry={() => void accountQuery.refetch()}
      />
    );
  }
  if (roleSwitchTarget && pathname !== roleSwitchTarget) {
    return <RouteLoading label="正在切换工作台" />;
  }
  if (!account || authorization?.level !== "allow") {
    return <RouteLoading label="正在前往可访问页面" />;
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
