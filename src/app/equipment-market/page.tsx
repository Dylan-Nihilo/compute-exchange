import type {Metadata} from "next";

import {EquipmentMarketView} from "@/components/equipment/equipment-market-view";
import {RouteTransition} from "@/components/layout/route-transition";
import {
  buildEquipmentMarketHref,
  parseEquipmentQuery,
  type EquipmentSearchParams,
} from "@/lib/equipment-api";

export const metadata: Metadata = {
  title: "设备市场",
  description: "一手/二手设备挂牌与询价撮合：GPU 服务器、存储、网络、制冷、UPS、机柜。",
};

type EquipmentMarketPageProps = {
  searchParams: Promise<EquipmentSearchParams>;
};

// 列表数据在客户端经鉴权 BFF 拉取(浏览需登录), 服务端只解析 URL 筛选状态。
export default async function EquipmentMarketPage({searchParams}: EquipmentMarketPageProps) {
  const query = parseEquipmentQuery(await searchParams);
  const href = buildEquipmentMarketHref(query);

  return (
    <RouteTransition transitionKey={href}>
      <EquipmentMarketView key={href} query={query} />
    </RouteTransition>
  );
}
