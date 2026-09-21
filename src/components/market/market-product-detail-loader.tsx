"use client";

import {Button, Skeleton} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import Link from "next/link";

import {MarketProductDetailView} from "@/components/market/market-product-detail-view";
import {getMarketProduct} from "@/lib/market-api";

// 商品详情需登录浏览: 数据经鉴权 BFF(/api/market-proxy)在客户端拉取。
export function MarketProductDetailLoader({productId}: {productId: string}) {
  const query = useQuery({
    queryKey: ["market", "product", productId],
    queryFn: () => getMarketProduct(productId),
  });

  if (query.isPending) {
    return (
      <main className="mx-auto w-full max-w-[1160px] px-4 pt-12 pb-10 sm:px-8">
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="mt-6 h-[420px] w-full rounded-[22px]" />
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="mx-auto w-full max-w-[1160px] px-4 pt-12 pb-10 sm:px-8">
        <div className="rounded-[22px] border border-white/70 bg-white/80 p-10 text-center shadow-[0_16px_36px_rgba(6,37,59,0.06)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#173447]" role="alert">商品信息暂时不可用</p>
          <p className="mt-2 text-sm text-[#5f7888]">{query.error instanceof Error ? query.error.message : "请稍后重试"}</p>
          <Button className="mt-4 h-10 rounded-xl" variant="tertiary" onPress={() => void query.refetch()}>
            重试
          </Button>
        </div>
      </main>
    );
  }

  if (!query.data) {
    return (
      <main className="mx-auto w-full max-w-[1160px] px-4 pt-12 pb-10 sm:px-8">
        <div className="rounded-[22px] border border-white/70 bg-white/80 p-10 text-center shadow-[0_16px_36px_rgba(6,37,59,0.06)] backdrop-blur-xl">
          <p className="text-sm font-medium text-[#173447]">商品不存在或已下架</p>
          <Link className="mt-4 inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline" href="/market">
            返回算力市场
          </Link>
        </div>
      </main>
    );
  }

  return <MarketProductDetailView product={query.data} />;
}
