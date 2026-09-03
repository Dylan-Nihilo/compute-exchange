"use client";

import {create} from "zustand";
import {createJSONStorage, persist} from "zustand/middleware";

import type {Role} from "../domain/contracts";
import type {SessionAccount} from "./contracts";
import {resolveActiveRole} from "./session";

export const AUTH_STORAGE_KEY = "compute-exchange:session";

let finishHydration: () => void = () => {};

const safeStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Session persistence is best-effort; the in-memory session remains usable.
    }
  },
  removeItem: (name: string) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Storage may be unavailable in privacy-restricted browsing contexts.
    }
  },
}));

interface AuthState {
  account: SessionAccount | null;
  accountId: string | null;
  activeRole: Role | null;
  hasHydrated: boolean;
  rememberSession: boolean;
  roleSwitchTarget: string | null;
  establishSession: (
    account: SessionAccount,
    remember?: boolean,
  ) => void;
  selectRole: (role: Role, availableRoles: readonly Role[]) => boolean;
  beginRoleSwitch: (
    role: Role,
    availableRoles: readonly Role[],
    target: string,
  ) => boolean;
  completeRoleSwitch: () => void;
  signOut: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      finishHydration = () => {
        set({hasHydrated: true});
      };
      return {
        account: null,
        accountId: null,
        activeRole: null,
        hasHydrated: false,
        rememberSession: true,
        roleSwitchTarget: null,
        establishSession: (account, rememberSession = true) =>
          set({
            account,
            accountId: account.id,
            activeRole: resolveActiveRole(account.roles, get().activeRole),
            rememberSession,
          }),
        selectRole: (activeRole, availableRoles) => {
          if (!availableRoles.includes(activeRole)) return false;
          set({activeRole});
          return true;
        },
        beginRoleSwitch: (activeRole, availableRoles, roleSwitchTarget) => {
          if (!availableRoles.includes(activeRole)) return false;
          set({activeRole, roleSwitchTarget});
          return true;
        },
        completeRoleSwitch: () => set({roleSwitchTarget: null}),
        signOut: () =>
          set({
            account: null,
            accountId: null,
            activeRole: null,
            rememberSession: true,
            roleSwitchTarget: null,
          }),
        setHasHydrated: (hasHydrated) => set({hasHydrated}),
      };
    },
    {
      name: AUTH_STORAGE_KEY,
      version: 1,
      storage: safeStorage,
      partialize: ({account, accountId, activeRole, rememberSession}) =>
        rememberSession
          ? {account, accountId, activeRole, rememberSession}
          : {
              account: null,
              accountId: null,
              activeRole: null,
              rememberSession,
            },
      onRehydrateStorage: () => (_state, error) => {
        if (error) safeStorage?.removeItem(AUTH_STORAGE_KEY);
        queueMicrotask(finishHydration);
      },
    },
  ),
);
