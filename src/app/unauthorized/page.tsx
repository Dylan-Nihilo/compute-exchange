"use client";

import {EmptyState} from "@heroui-pro/react/empty-state";
import {Link} from "@heroui/react";

import {ReauthenticateButton} from "@/components/auth/reauthenticate-button";

export default function UnauthorizedPage() {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <EmptyState className="w-full max-w-md">
        <EmptyState.Header>
          <EmptyState.Title>当前身份无法访问</EmptyState.Title>
          <EmptyState.Description>
            该页面需要其他身份或权限。可返回首页，或重新登录账户。
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content className="flex-row gap-3">
          <Link href="/">
            返回首页
            <Link.Icon />
          </Link>
          <ReauthenticateButton />
        </EmptyState.Content>
      </EmptyState>
    </main>
  );
}
