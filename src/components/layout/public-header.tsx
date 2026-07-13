"use client";

import {Navbar} from "@heroui-pro/react/navbar";
import {Button, Skeleton} from "@heroui/react";
import {usePathname, useRouter} from "next/navigation";
import {useEffect, useState} from "react";

import {useCurrentAccount} from "@/lib/auth/queries";
import {resolveActiveRole} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const accountQuery = useCurrentAccount();
  const account = accountQuery.data;
  const accountId = useAuthStore((state) => state.accountId);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const activeRole = useAuthStore((state) => state.activeRole);
  const isAccountPending =
    !isMounted || !hasHydrated || (Boolean(accountId) && accountQuery.isPending);
  const workspaceHref = account
    ? homeForRole(resolveActiveRole(account.roles, activeRole))
    : null;

  useEffect(() => setIsMounted(true), []);

  return (
    <Navbar maxWidth="xl" navigate={router.push} position="sticky">
      <Navbar.Header>
        <Navbar.Brand>
          <Navbar.Item aria-label="算力交易平台" className="gap-3 px-0" href="/">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-md bg-accent text-sm font-semibold tracking-tight text-accent-foreground"
            >
              算
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              算力交易平台
            </span>
          </Navbar.Item>
        </Navbar.Brand>

        <Navbar.Spacer />
        <Navbar.Content className="hidden sm:flex">
          <Navbar.Item href="/market" isCurrent={pathname === "/market"}>
            算力市场
          </Navbar.Item>
          {isAccountPending ? (
            <Skeleton aria-label="正在读取账户" className="h-8 w-24 rounded-lg" />
          ) : workspaceHref ? (
            <Button onPress={() => router.push(workspaceHref)} size="sm">
              进入工作台
            </Button>
          ) : (
            <>
              <Navbar.Item href="/auth/login">
                登录
              </Navbar.Item>
              <Button onPress={() => router.push("/auth/register")} size="sm">
                注册
              </Button>
            </>
          )}
        </Navbar.Content>
        <Navbar.MenuToggle className="sm:hidden" srLabel="打开主导航" />
      </Navbar.Header>

      <Navbar.Menu>
        <Navbar.MenuItem href="/market" isCurrent={pathname === "/market"}>
          算力市场
        </Navbar.MenuItem>
        {isAccountPending ? null : workspaceHref ? (
          <Navbar.MenuItem href={workspaceHref}>进入工作台</Navbar.MenuItem>
        ) : (
          <>
            <Navbar.MenuItem href="/auth/login">登录</Navbar.MenuItem>
            <Navbar.MenuItem href="/auth/register">注册</Navbar.MenuItem>
          </>
        )}
      </Navbar.Menu>
    </Navbar>
  );
}
