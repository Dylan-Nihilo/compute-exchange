"use client";

import {Button} from "@heroui/react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";

import {useCurrentAccount} from "@/lib/auth/queries";
import {useAuthStore} from "@/lib/auth/store";
import type {Role} from "@/lib/domain/contracts";
import {homeForRole} from "@/lib/domain/routes";

const roleLabels: Record<Role, string> = {
  guest: "访客",
  buyer: "买家",
  supplier: "供给方",
  vendor: "设备厂商",
  funder: "资方",
  operator: "平台运营",
  admin: "系统管理员",
};

export function WorkspaceShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const {data: account} = useCurrentAccount();
  const activeRole = useAuthStore((state) => state.activeRole);
  const beginRoleSwitch = useAuthStore((state) => state.beginRoleSwitch);
  const signOut = useAuthStore((state) => state.signOut);

  if (
    !account ||
    !activeRole ||
    activeRole === "guest" ||
    !account.roles.includes(activeRole)
  ) {
    return null;
  }

  const overviewHref = homeForRole(activeRole);
  const navigation = [
    {href: overviewHref, label: "工作台概览"},
    {href: "/market", label: "算力市场"},
    ...(activeRole === "operator" || activeRole === "admin"
      ? []
      : [{href: "/auth/identity", label: "身份与认证"}]),
  ];

  function changeRole(role: Role) {
    beginRoleSwitch(role, account!.roles, homeForRole(role));
  }

  function logout() {
    signOut();
    router.replace("/auth/login");
  }

  const navigationList = (
    <nav aria-label="工作台导航" className="space-y-1">
      {navigation.map((item) => {
        const selected = pathname === item.href;
        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              selected
                ? "bg-surface-tertiary text-foreground"
                : "text-muted hover:bg-surface-secondary hover:text-foreground"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[15.5rem_1fr]">
      <aside className="hidden border-r border-border bg-surface px-4 py-5 lg:flex lg:min-h-svh lg:flex-col">
        <Link className="px-3 text-xs font-semibold tracking-[0.16em]" href="/">
          COMPUTE EXCHANGE
        </Link>
        <div className="mt-10">{navigationList}</div>
        <div className="mt-auto border-t border-border px-3 pt-5">
          <p className="truncate text-sm font-medium text-foreground">
            {account.displayName}
          </p>
          <p className="mt-1 text-xs text-muted">{account.email}</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur-sm">
          <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <details className="relative lg:hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                导航
              </summary>
              <div className="absolute left-0 top-12 w-64 rounded-xl border border-border bg-surface p-2 shadow-lg">
                {navigationList}
              </div>
            </details>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted">
                工作台 / {roleLabels[activeRole]}
              </p>
            </div>
            {account.roles.length > 1 ? (
              <label className="sr-only" htmlFor="workspace-role">
                当前身份
              </label>
            ) : null}
            {account.roles.length > 1 ? (
              <select
                className="min-h-10 max-w-32 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
                id="workspace-role"
                onChange={(event) => changeRole(event.target.value as Role)}
                value={activeRole}
              >
                {account.roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="hidden text-sm text-muted sm:inline">
                {roleLabels[activeRole]}
              </span>
            )}
            <Button onPress={logout} size="sm" variant="ghost">
              退出
            </Button>
          </div>
        </header>
        <main className="px-4 py-7 sm:px-6 lg:px-8 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
