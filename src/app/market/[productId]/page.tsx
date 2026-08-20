import type {Metadata} from "next";
import {notFound} from "next/navigation";

import {RouteTransition} from "@/components/layout/route-transition";
import {MarketProductDetailView} from "@/components/market/market-product-detail-view";
import {getMarketProduct} from "@/lib/market-api";

export const metadata: Metadata = {
  title: "算力商品详情",
  description: "查看算力商品规格、供给余量、交付方式与参考价格。",
};

type MarketProductPageProps = {
  params: Promise<{productId: string}>;
};

export default async function MarketProductPage({
  params,
}: MarketProductPageProps) {
  const {productId} = await params;
  const product = await getMarketProduct(productId);
  if (!product) notFound();

  return (
    <RouteTransition transitionKey={`/market/${productId}`}>
      <MarketProductDetailView product={product} />
    </RouteTransition>
  );
}
