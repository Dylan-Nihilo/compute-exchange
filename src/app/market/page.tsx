import type {Metadata} from "next";

import {MarketView} from "@/components/market/market-view";

export const metadata: Metadata = {
  title: "算力市场",
  description: "按 GPU 型号、区域与交付方式查找可用算力。",
};

const supplies = [
  {
    id: "supply-h100-64",
    name: "H100 SXM 80GB 训练集群",
    location: "内蒙古 · 乌兰察布",
    capacity: "64 GPU",
    delivery: "容器集群",
    network: "100 Gbps",
    price: "¥18.60",
  },
  {
    id: "supply-h20-128",
    name: "H20 96GB 推理集群",
    location: "宁夏 · 中卫",
    capacity: "128 GPU",
    delivery: "专属实例",
    network: "50 Gbps",
    price: "¥9.80",
  },
  {
    id: "supply-a800-32",
    name: "A800 80GB 训练资源",
    location: "上海 · 临港",
    capacity: "32 GPU",
    delivery: "裸金属",
    network: "25 Gbps",
    price: "¥12.40",
  },
] as const;

type MarketPageProps = {
  searchParams: Promise<{q?: string | string[]}>;
};

export default async function MarketPage({searchParams}: MarketPageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("zh-CN");
  const results = normalizedQuery
    ? supplies.filter((supply) =>
        [
          supply.name,
          supply.location,
          supply.capacity,
          supply.delivery,
          supply.network,
        ].some((value) => value.toLocaleLowerCase("zh-CN").includes(normalizedQuery)),
      )
    : supplies;

  return <MarketView query={query} results={results} />;
}
