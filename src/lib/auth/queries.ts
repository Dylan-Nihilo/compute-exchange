"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {
  registerSmsApi,
  requestSmsCodeApi,
  smsLoginApi,
} from "./api";
import {verifyCaptcha} from "../captcha/cap";
import {
  applyForIdentity,
  getAccount,
  listDemoAccounts,
  listIdentityApplications,
  login,
  requestEmailCode,
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
  const sessionAccount = useAuthStore((state) => state.account);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  return useQuery({
    queryKey: authKeys.account(accountId),
    queryFn: () => sessionAccount ?? getAccount(accountId!),
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
    mutationFn: ({credentials, remember}: {credentials: LoginInput; remember: boolean}) =>
      credentials.method === "sms"
        ? smsLoginApi({...credentials, remember})
        : login(credentials),
    onSuccess: (account, {remember}) => {
      establishSession(account, remember);
      queryClient.setQueryData(authKeys.account(account.id), account);
    },
  });
}

export function useRequestSmsCode(purpose: "login" | "register") {
  return useMutation({
    mutationFn: (input: {phoneNumber: string; captchaToken: string}) =>
      requestSmsCodeApi({...input, purpose}),
  });
}

export function useRequestEmailCode() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof requestEmailCode>[0]) => {
      await verifyCaptcha(input.captchaToken);
      return requestEmailCode(input);
    },
  });
}

export function useRegisterSms() {
  return useMutation({mutationFn: (input: Parameters<typeof registerSmsApi>[0]) => registerSmsApi(input)});
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
