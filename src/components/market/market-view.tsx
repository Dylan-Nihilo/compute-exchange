"use client";

import {Button, Form, Link, SearchField} from "@heroui/react";

import {
  MarketBrowser,
  type MarketSupply,
} from "@/components/market/market-browser";

type MarketViewProps = {
  query: string;
  results: readonly MarketSupply[];
};

export function MarketView({query, results}: MarketViewProps) {
  return (
    <main>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="mb-3 text-sm font-medium text-muted">算力市场</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
            查找可用算力
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            按 GPU 型号、部署区域或交付方式检索当前供给。
          </p>

          <Form
            action="/market"
            className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
            role="search"
          >
            <SearchField
              aria-label="搜索算力供给"
              defaultValue={query}
              fullWidth
              name="q"
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="搜索 GPU 型号、区域或交付方式" />
                <SearchField.ClearButton aria-label="清除搜索内容" />
              </SearchField.Group>
            </SearchField>
            <Button className="sm:h-9 sm:min-w-24" size="md" type="submit">
              搜索
            </Button>
          </Form>
        </div>
      </section>

      <section
        aria-labelledby="supply-heading"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8"
      >
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight" id="supply-heading">
              可用供给
            </h2>
            <p aria-live="polite" className="mt-1 text-sm text-muted">
              {query
                ? `“${query}”找到 ${results.length} 条结果`
                : `共 ${results.length} 条结果`}
            </p>
          </div>
          {query ? <Link href="/market">清除搜索</Link> : null}
        </div>

        <MarketBrowser supplies={results} />
      </section>
    </main>
  );
}
