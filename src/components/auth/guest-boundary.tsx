"use client";

import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

import {ErrorState, LoadingState} from "@/components/system/operation-state";
import {useCurrentAccount} from "@/lib/auth/queries";
import {resolveActiveRole} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";

export function GuestBoundary({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const accountId = useAuthStore((state) => state.accountId);
  const activeRole = useAuthStore((state) => state.activeRole);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const selectRole = useAuthStore((state) => state.selectRole);
  const signOut = useAuthStore((state) => state.signOut);
  const accountQuery = useCurrentAccount();
  const account = accountQuery.data;
  const [entryAccountId, setEntryAccountId] = useState<
    string | null | undefined
  >(undefined);

  useEffect(() => {
    if (hasHydrated && entryAccountId === undefined) {
      setEntryAccountId(accountId);
    }
  }, [accountId, entryAccountId, hasHydrated]);

  useEffect(() => {
    if (
      !hasHydrated ||
      !entryAccountId ||
      !accountId ||
      !accountQuery.isSuccess
    ) {
      return;
    }
    if (!account) {
      signOut();
      return;
    }
    const role = resolveActiveRole(account.roles, activeRole);
    if (role !== activeRole) selectRole(role, account.roles);
    router.replace(homeForRole(role));
  }, [
    account,
    accountId,
    accountQuery.isSuccess,
    activeRole,
    entryAccountId,
    hasHydrated,
    router,
    selectRole,
    signOut,
  ]);

  if (
    !hasHydrated ||
    entryAccountId === undefined ||
    (entryAccountId && accountId && accountQuery.isPending)
  ) {
    return <LoadingState label="正在读取账户状态" />;
  }
  if (accountQuery.isError) {
    return (
      <ErrorState
        description={
          accountQuery.error instanceof Error
            ? accountQuery.error.message
            : "账户状态暂时无法读取。"
        }
        onRetry={() => void accountQuery.refetch()}
      />
    );
  }
  if (entryAccountId && accountId && account) {
    return <LoadingState label="正在进入工作台" />;
  }

  return children;
}
