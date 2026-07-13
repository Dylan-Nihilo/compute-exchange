"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {
  applyForIdentity,
  getAccount,
  listDemoAccounts,
  listIdentityApplications,
  login,
  requestSmsCode,
  register,
  resetDemo,
  verifyAccount,
  type IdentityApplicationInput,
  type LoginInput,
  type VerificationInput,
} from "./service";
import {useAuthStore} from "./store";

export const authKeys = {
  all: ["auth"] as const,
  account: (accountId: string | null) => ["auth", "account", accountId] as const,
  demos: ["auth", "demo-accounts"] as const,
  applications: (accountId: string | null) =>
    ["auth", "identity-applications", accountId] as const,
};

export function useCurrentAccount() {
  const accountId = useAuthStore((state) => state.accountId);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  return useQuery({
    queryKey: authKeys.account(accountId),
    queryFn: () => getAccount(accountId!),
    enabled: hasHydrated && Boolean(accountId),
  });
}

export function useDemoAccounts() {
  return useQuery({queryKey: authKeys.demos, queryFn: () => listDemoAccounts()});
}

export function useIdentityApplications() {
  const accountId = useAuthStore((state) => state.accountId);
  return useQuery({
    queryKey: authKeys.applications(accountId),
    queryFn: () => listIdentityApplications(accountId!),
    enabled: Boolean(accountId),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const establishSession = useAuthStore((state) => state.establishSession);
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (account) => {
      establishSession(account);
      queryClient.setQueryData(authKeys.account(account.id), account);
    },
  });
}

export function useRequestSmsCode() {
  return useMutation({
    mutationFn: (input: Parameters<typeof requestSmsCode>[0]) =>
      requestSmsCode(input),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const establishSession = useAuthStore((state) => state.establishSession);
  return useMutation({
    mutationFn: (input: Parameters<typeof register>[0]) => register(input),
    onSuccess: (account) => {
      establishSession(account);
      queryClient.setQueryData(authKeys.account(account.id), account);
      void queryClient.invalidateQueries({queryKey: authKeys.demos});
    },
  });
}

export function useVerifyAccount() {
  const accountId = useAuthStore((state) => state.accountId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VerificationInput) => verifyAccount(accountId!, input),
    onSuccess: (account) => {
      queryClient.setQueryData(authKeys.account(account.id), account);
    },
  });
}

export function useApplyForIdentity() {
  const accountId = useAuthStore((state) => state.accountId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: IdentityApplicationInput) =>
      applyForIdentity(accountId!, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: authKeys.applications(accountId),
      }),
  });
}

export function useResetDemo() {
  const queryClient = useQueryClient();
  const signOut = useAuthStore((state) => state.signOut);
  return useMutation({
    mutationFn: () => resetDemo(),
    onSuccess: (accounts) => {
      signOut();
      queryClient.clear();
      queryClient.setQueryData(authKeys.demos, accounts);
    },
  });
}
