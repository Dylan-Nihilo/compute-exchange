import type {Metadata} from "next";
import Link from "next/link";

import {ReauthenticateButton} from "@/components/auth/reauthenticate-button";

export const metadata: Metadata = {title: "无权访问"};

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-5 py-12">
      <section className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">当前身份无法访问</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          该页面需要其他身份或权限。可返回首页，或重新登录账户。
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            href="/"
          >
            返回首页
          </Link>
          <ReauthenticateButton />
        </div>
      </section>
    </main>
  );
}
