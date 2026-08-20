import type {Metadata} from "next";
import {redirect} from "next/navigation";

import {RouteTransition} from "@/components/layout/route-transition";
import {MarketView} from "@/components/market/market-view";
import {
  buildMarketHref,
  getMarketSupplies,
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

export default async function MarketPage({searchParams}: MarketPageProps) {
  const query = parseMarketQuery(await searchParams);
  const result = await getMarketSupplies(query);
  if (query.page > result.totalPages) {
    redirect(buildMarketHref({...query, page: result.totalPages}));
  }

  const href = buildMarketHref(query);

  return (
    <RouteTransition transitionKey={href}>
      <MarketView key={href} query={query} result={result} />
    </RouteTransition>
  );
}
