"use client";

import {EmptyState} from "@heroui-pro/react/empty-state";
import {Link} from "@heroui/react";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center px-5 py-12">
      <EmptyState className="w-full max-w-md">
        <EmptyState.Header>
          <EmptyState.Media>404</EmptyState.Media>
          <EmptyState.Title>页面不存在</EmptyState.Title>
        </EmptyState.Header>
        <EmptyState.Content>
          <Link href="/">
            返回首页
            <Link.Icon />
          </Link>
        </EmptyState.Content>
      </EmptyState>
    </main>
  );
}
