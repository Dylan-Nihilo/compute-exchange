"use client";

import {useQuery} from "@tanstack/react-query";
import {Button, Skeleton} from "@heroui/react";
import {useRouter} from "next/navigation";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {
  fetchMyProductGroups,
  pricingModeCopy,
  productStatusCopy,
  productTypeCopy,
} from "@/lib/supplier-workspace";

const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

const statusTone: Record<string, string> = {
  draft: "bg-[#edf1f3] text-[#78909c]",
  pending: "bg-[#fff3e0] text-[#b25e09]",
  active: "bg-[#e5f7d9] text-[#4c7c0f]",
  sold_out: "bg-[#fff3e0] text-[#b25e09]",
  offline: "bg-[#edf1f3] text-[#78909c]",
  frozen: "bg-[#fdeaea] text-[#c4392f]",
};

export default function SupplierProductsPage() {
  const router = useRouter();
  const groupsQuery = useQuery({
    queryKey: ["supplier", "products", "summary"],
    queryFn: () => fetchMyProductGroups(),
  });

  const groups = groupsQuery.data ?? [];
  const allProducts = groups.flatMap((group) => group.products ?? []);

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        actions={
          <Button
            className="h-10 min-w-28 rounded-xl bg-[#c9f556] px-5 text-sm font-semibold text-[#173447] transition-colors hover:bg-[#b8e643]"
            onPress={() => router.push("/console/supplier/products/new")}
          >
            发布算力
          </Button>
        }
        title="算力商品"
      />

      {groupsQuery.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["s1", "s2", "s3", "s4"].map((key) => <Skeleton className="h-24 w-full rounded-[20px]" key={key} />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <GlassCard className="px-5 py-4" key={group.product_type}>
              <p className="text-xs text-[#78909c]">{group.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#173447]">
                {group.active_count}
                <span className="ml-1 text-xs font-normal text-[#78909c]">/ {group.count} 个商品</span>
              </p>
              <p className="mt-1 text-xs text-[#78909c]">
                库存 {group.total_stock}
                {group.total_card > 0 ? ` · ${group.total_card} 卡` : ""}
                {group.total_machine > 0 ? ` · ${group.total_machine} 台` : ""}
              </p>
            </GlassCard>
          ))}
          {groups.length === 0 ? (
            <GlassCard className="px-5 py-4 sm:col-span-2 lg:col-span-4">
              <p className="text-sm text-[#78909c]">还没有商品。点击右上角「发布算力」创建第一个商品。</p>
            </GlassCard>
          ) : null}
        </div>
      )}

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">商品列表</h2>
        <div aria-busy={groupsQuery.isPending} className="mt-4 min-h-[240px]">
          {groupsQuery.isPending ? (
            <div className="space-y-3">
              {["s1", "s2", "s3"].map((key) => <Skeleton className="h-14 w-full rounded-xl" key={key} />)}
            </div>
          ) : groupsQuery.isError ? (
            <ErrorState
              description={groupsQuery.error instanceof Error ? groupsQuery.error.message : undefined}
              isPending={groupsQuery.isFetching}
              onRetry={() => void groupsQuery.refetch()}
              title="商品数据暂时不可用"
            />
          ) : allProducts.length ? (
            <div className="omnis-scrollbar-x">
              <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
                <caption className="sr-only">我的算力商品</caption>
                <colgroup>
                  <col className="w-[210px]" />
                  <col className="w-[130px]" />
                  <col className="w-[110px]" />
                  <col className="w-[120px]" />
                  <col className="w-[90px]" />
                  <col className="w-[100px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">商品</th>
                    <th className="px-4" scope="col">类型</th>
                    <th className="px-4" scope="col">计费</th>
                    <th className="px-4" scope="col">单价</th>
                    <th className="px-4" scope="col">库存</th>
                    <th className="px-4" scope="col">状态</th>
                    <th className="rounded-r-[14px] px-4" scope="col">地域</th>
                  </tr>
                </thead>
                <tbody>
                  {allProducts.map((product) => (
                    <tr className="border-b border-[#dce9ee]/75 last:border-0" key={product.id}>
                      <th className="px-4 py-3.5" scope="row">
                        <p className="truncate text-[13px] font-medium text-[#173447]">
                          {(product.gpu_model || "算力资源").replace(/^NVIDIA\s+/i, "")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8aa0ab]">
                          {product.card_count > 0 ? `${product.card_count} 卡` : ""}
                          {product.machine_count ? `${product.machine_count} 台` : ""}
                          {product.total_pflops_approx ? ` · ${product.total_pflops_approx}` : ""}
                        </p>
                      </th>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                        {productTypeCopy[product.product_type] ?? product.product_type}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                        {pricingModeCopy[product.pricing_mode] ?? product.pricing_mode}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-[#173447]">
                        {product.price_negotiable ? "面议" : money.format(product.unit_price / 100)}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{product.stock}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[product.status] ?? statusTone.draft}`}>
                          {productStatusCopy[product.status] ?? product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{product.region}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="发布后商品进入平台审核, 通过即在算力市场上架。"
              title="还没有商品"
            />
          )}
        </div>
      </GlassCard>
    </section>
  );
}
