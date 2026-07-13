"use client";

import Link from "next/link";

import {useCurrentAccount} from "@/lib/auth/queries";
import {resolveActiveRole} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";

export function PublicHeader() {
  const {data: account} = useCurrentAccount();
  const activeRole = useAuthStore((state) => state.activeRole);
  const workspaceHref = account
    ? homeForRole(resolveActiveRole(account.roles, activeRole))
    : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          className="flex min-h-11 items-center gap-3 rounded-lg text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-md bg-accent text-sm font-semibold tracking-tight text-accent-foreground"
          >
            算
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            算力交易平台
          </span>
        </Link>

        <nav aria-label="主导航" className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            aria-current="page"
            className="inline-flex min-h-11 items-center rounded-lg bg-surface-secondary px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus sm:px-4"
            href="/market"
          >
            算力市场
          </Link>
          {workspaceHref ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4"
              href={workspaceHref}
            >
              进入工作台
            </Link>
          ) : (
            <>
              <Link
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted outline-none transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus sm:px-4"
                href="/auth/login"
              >
                登录
              </Link>
              <Link
                className="inline-flex min-h-11 items-center rounded-lg bg-accent px-3 text-sm font-medium text-accent-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4"
                href="/auth/register"
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
