"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useEffect} from "react";

import {
  currentAccountApi,
  logoutApi,
  registerSmsApi,
  requestSmsCodeApi,
  smsLoginApi,
} from "./api";
import {
  applyForIdentity,
  listIdentityApplications,
  verifyAccount,
  type IdentityApplicationInput,
  type VerificationInput,
} from "./service";
import {useAuthStore} from "./store";

export const authKeys = {
  all: ["auth"] as const,
  account: ["auth", "account"] as const,
  applications: (accountId: string | null) =>
    ["auth", "identity-applications", accountId] as const,
};

export function useCurrentAccount() {
  const accountId = useAuthStore((state) => state.accountId);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const rememberSession = useAuthStore((state) => state.rememberSession);
  const establishSession = useAuthStore((state) => state.establishSession);
  const signOut = useAuthStore((state) => state.signOut);

  const query = useQuery({
    queryKey: authKeys.account,
    queryFn: () => currentAccountApi(),
    enabled: hasHydrated,
    retry: false,
  });

  useEffect(() => {
    if (!query.isSuccess) return;
    if (query.data) establishSession(query.data, rememberSession);
    else if (accountId) signOut();
  }, [
    accountId,
    establishSession,
    query.data,
    query.isSuccess,
    rememberSession,
    signOut,
  ]);

  return query;
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
    mutationFn: (input: Parameters<typeof smsLoginApi>[0]) => smsLoginApi(input),
    onSuccess: (account, {remember}) => {
      establishSession(account, remember);
      queryClient.setQueryData(authKeys.account, account);
    },
  });
}

export function useRequestSmsCode(purpose: "login" | "register") {
  return useMutation({
    mutationFn: (input: {phoneNumber: string; captchaToken: string}) =>
      requestSmsCodeApi({...input, purpose}),
  });
}

export function useRegisterSms() {
  const queryClient = useQueryClient();
  const establishSession = useAuthStore((state) => state.establishSession);
  return useMutation({
    mutationFn: (input: Parameters<typeof registerSmsApi>[0]) => registerSmsApi(input),
    onSuccess: (account, {remember}) => {
      establishSession(account, remember);
      queryClient.setQueryData(authKeys.account, account);
    },
  });
}

export function useVerifyAccount() {
  const accountId = useAuthStore((state) => state.accountId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VerificationInput) => verifyAccount(accountId!, input),
    onSuccess: (account) => {
      queryClient.setQueryData(authKeys.account, account);
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

export function useLogout() {
  const queryClient = useQueryClient();
  const signOut = useAuthStore((state) => state.signOut);
  return useMutation({
    mutationFn: logoutApi,
    onSettled: () => {
      signOut();
      queryClient.removeQueries({queryKey: authKeys.all});
    },
  });
}
