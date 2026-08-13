"use client";

import {Link, buttonVariants} from "@heroui/react";
import {EmptyState} from "@heroui-pro/react/empty-state";

export default function MarketProductNotFound() {
  return (
    <main className="mx-auto grid min-h-[60svh] w-full max-w-7xl place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <EmptyState size="lg">
        <EmptyState.Header>
          <EmptyState.Title>未找到该算力商品</EmptyState.Title>
          <EmptyState.Description>
            商品可能已下架，或访问地址有误。
          </EmptyState.Description>
        </EmptyState.Header>
        <EmptyState.Content>
          <Link
            className={buttonVariants({variant: "outline"})}
            href="/market"
          >
            返回算力市场
          </Link>
        </EmptyState.Content>
      </EmptyState>
    </main>
  );
}
