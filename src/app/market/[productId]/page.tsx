import type {Metadata} from "next";

import {RouteTransition} from "@/components/layout/route-transition";
import {MarketProductDetailLoader} from "@/components/market/market-product-detail-loader";

export const metadata: Metadata = {
  title: "算力商品详情",
  description: "查看算力商品规格、供给余量、交付方式与参考价格。",
};

type MarketProductPageProps = {
  params: Promise<{productId: string}>;
};

// 详情数据在客户端经鉴权 BFF 拉取(浏览需登录), 服务端不再 SSR 直连后端。
export default async function MarketProductPage({
  params,
}: MarketProductPageProps) {
  const {productId} = await params;

  return (
    <RouteTransition transitionKey={`/market/${productId}`}>
      <MarketProductDetailLoader productId={productId} />
    </RouteTransition>
  );
}
