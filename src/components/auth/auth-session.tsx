"use client";

import {usePathname, useRouter} from "next/navigation";
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
  const router = useRouter();
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
    router.replace(destination.path);
  }, [
    accountQuery.data,
    hasHydrated,
    isGuestOnly,
    router,
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
