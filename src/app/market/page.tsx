import type {Metadata} from "next";

import {RouteTransition} from "@/components/layout/route-transition";
import {MarketView} from "@/components/market/market-view";
import {
  buildMarketHref,
  parseMarketQuery,
  type MarketSearchParams,
} from "@/lib/market-api";

export const metadata: Metadata = {
  title: "算力市场",
  description: "按 GPU 型号、区域与交付方式查找可用算力。",
};

type MarketPageProps = {
  searchParams: Promise<MarketSearchParams>;
};

// 列表数据在客户端经鉴权 BFF(/api/market-proxy)拉取(浏览需登录), 服务端只解析 URL 筛选状态。
export default async function MarketPage({searchParams}: MarketPageProps) {
  const query = parseMarketQuery(await searchParams);
  const href = buildMarketHref(query);

  return (
    <RouteTransition transitionKey={href}>
      <MarketView key={href} query={query} />
    </RouteTransition>
  );
}
