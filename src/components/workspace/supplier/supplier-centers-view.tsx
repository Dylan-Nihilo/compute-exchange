"use client";

import {Button, Link, Skeleton} from "@heroui/react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import type {ReactNode} from "react";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {
  pricingModeCopy,
  productStatusCopy,
  type SupplierProduct,
  type SupplierProductGroup,
} from "@/lib/supplier-workspace";

const statusTone: Record<string, string> = {
  draft: "bg-[#edf1f3] text-[#78909c]",
  pending: "bg-[#fff3e0] text-[#b25e09]",
  active: "bg-[#e5f7d9] text-[#4c7c0f]",
  sold_out: "bg-[#fff3e0] text-[#b25e09]",
  offline: "bg-[#edf1f3] text-[#78909c]",
  frozen: "bg-[#fdeaea] text-[#c4392f]",
};

// Utilization estimate: idle = sellable stock, rented = capacity - stock.
// Capacity basis prefers card count and falls back to machine count.
function utilizationOf(capacity: number, stock: number) {
  if (capacity <= 0) return null;
  const idle = Math.min(Math.max(stock, 0), capacity);
  const rentedPct = Math.round(((capacity - idle) / capacity) * 100);
  return {idlePct: 100 - rentedPct, rentedPct};
}

function productCapacity(product: SupplierProduct) {
  return product.card_count > 0 ? product.card_count : (product.machine_count ?? 0);
}

// total_pflops_approx is a free-form supplier string (e.g. "约128P");
// sum the parseable numeric parts for the aggregate KPI.
function sumPflops(products: SupplierProduct[]) {
  let total = 0;
  let found = false;
  for (const product of products) {
    const match = product.total_pflops_approx?.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      total += Number(match[1]);
      found = true;
    }
  }
  if (!found) return null;
  return `约 ${Number.isInteger(total) ? total : total.toFixed(1)}P`;
}

function formatPower(kw: number | null) {
  if (!kw) return "—";
  if (kw >= 1000) return `${(kw / 1000).toFixed(kw % 1000 === 0 ? 0 : 1)} MW`;
  return `${kw} kW`;
}

function KpiCard({
  icon,
  label,
  sub,
  value,
}: {
  icon: string;
  label: string;
  sub: string;
  value: ReactNode;
}) {
  return (
    <div className="relative flex flex-col gap-2 rounded-[18px] border border-white/25 bg-[#f8fcfe]/80 p-5 backdrop-blur-md drop-shadow-[0px_10px_12px_rgba(9,38,59,0.08)]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-[#5c788a]">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-[11px] border border-white/50 bg-[#dbf2fa]/85 shadow-[inset_0px_1px_1px_rgba(255,255,255,0.72)]">
          <Image alt="" aria-hidden height={16} src={icon} width={16} />
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[32px] leading-10 font-semibold text-[#0c1a25]">{value}</p>
        <p className="text-xs leading-[18px] text-[#5c788a]">{sub}</p>
      </div>
    </div>
  );
}

// 成熟算力中心页: product_type=center 商品组的规模 KPI + 中心明细表。
// 数据来源仅限 fetchMyProductGroups() 的 center 组, 无对应后端的字段(中心名称/编辑/盘点)不伪造。
export function SupplierCentersView({
  error,
  group,
  isError,
  isFetching,
  isPending,
  onRetry,
}: {
  error?: string;
  group: SupplierProductGroup | null;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  onRetry: () => void;
}) {
  const router = useRouter();
  const products = group?.products ?? [];
  const totalPflops = sumPflops(products);
  const groupCapacity = group ? (group.total_card > 0 ? group.total_card : group.total_machine) : 0;
  const groupUtilization = group ? utilizationOf(groupCapacity, group.total_stock) : null;

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#173447]">成熟算力中心</h1>
          <p className="mt-1 text-[13px] text-[#5c788a]">管理整站算力规模、出租状态与资源盘点</p>
        </div>
        <Button
          className="h-10 min-w-[136px] rounded-xl bg-[#caf842] px-4 text-sm font-medium text-[#10202b] transition-colors hover:bg-[#b8e643]"
          onPress={() => router.push("/console/supplier/products/new")}
        >
          发布算力中心
        </Button>
      </header>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["s1", "s2", "s3", "s4"].map((key) => <Skeleton className="h-[136px] w-full rounded-[18px]" key={key} />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon="/images/supplier-workspace/server.svg"
            label="在架台数"
            sub={`台 · 共 ${group?.count ?? 0} 个中心`}
            value={group?.total_machine ?? 0}
          />
          <KpiCard
            icon="/images/supplier-workspace/layers.svg"
            label="总卡数"
            sub="卡 · 当前资源规模"
            value={group?.total_card ?? 0}
          />
          <KpiCard
            icon="/images/supplier-workspace/gauge.svg"
            label="约总算力"
            sub="供给方自行填报"
            value={totalPflops ?? "—"}
          />
          <KpiCard
            icon="/images/supplier-workspace/chart-no-axes-combined-16.svg"
            label="已租 / 闲置"
            sub={groupUtilization ? "按可售库存估算" : "暂无资源规模数据"}
            value={
              groupUtilization ? (
                <>
                  <span className="text-[#2e6933]">{groupUtilization.rentedPct}%</span>
                  <span className="text-[#0c1a25]"> / </span>
                  <span className="text-[#ce393b]">{groupUtilization.idlePct}%</span>
                </>
              ) : (
                "—"
              )
            }
          />
        </div>
      )}

      <GlassCard className="px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[34px] items-center justify-center rounded-xl bg-[#e4f4fb]/75">
            <Image alt="" aria-hidden height={18} src="/images/supplier-workspace/network.svg" width={18} />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-[#173447]">算力中心列表</h2>
            <p className="mt-0.5 text-xs text-[#5c788a]">按资源规模、利用率与审核状态管理中心</p>
          </div>
        </div>

        <div aria-busy={isPending} className="mt-4 min-h-[240px]">
          {isPending ? (
            <div className="space-y-3">
              {["s1", "s2", "s3"].map((key) => <Skeleton className="h-14 w-full rounded-xl" key={key} />)}
            </div>
          ) : isError ? (
            <ErrorState
              description={error}
              isPending={isFetching}
              onRetry={onRetry}
              title="算力中心数据暂时不可用"
            />
          ) : products.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] table-fixed border-collapse text-left">
                <caption className="sr-only">成熟算力中心列表</caption>
                <colgroup>
                  <col className="w-[170px]" />
                  <col className="w-[120px]" />
                  <col className="w-[64px]" />
                  <col className="w-[70px]" />
                  <col className="w-[96px]" />
                  <col className="w-[84px]" />
                  <col className="w-[76px]" />
                  <col className="w-[128px]" />
                  <col className="w-[84px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">中心名称</th>
                    <th className="px-4" scope="col">卡型</th>
                    <th className="px-4" scope="col">台数</th>
                    <th className="px-4" scope="col">卡数</th>
                    <th className="px-4" scope="col">约算力</th>
                    <th className="px-4" scope="col">电力</th>
                    <th className="px-4" scope="col">计费</th>
                    <th className="px-4" scope="col">已租 / 闲置</th>
                    <th className="px-4" scope="col">状态</th>
                    <th className="rounded-r-[14px] px-4 text-right" scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const utilization = utilizationOf(productCapacity(product), product.stock);
                    return (
                      <tr className="border-b border-[#dce9ee]/75 last:border-0" key={product.id}>
                        <th className="px-4 py-3.5" scope="row">
                          <p className="truncate text-[13px] font-medium text-[#173447]">{product.region}</p>
                          <p className="mt-0.5 text-[11px] text-[#8aa0ab]">PRD-#{product.id}</p>
                        </th>
                        <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{product.gpu_model || "—"}</td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-[#24495d]">
                          {product.machine_count ?? "—"}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-[#24495d]">{product.card_count}</td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-[#173447]">
                          {product.total_pflops_approx || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                          {formatPower(product.power_capacity_kw)}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                          {product.price_negotiable
                            ? "面议"
                            : (pricingModeCopy[product.pricing_mode] ?? product.pricing_mode)}
                        </td>
                        <td className="px-4 py-3.5">
                          {utilization ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[13px] font-medium whitespace-nowrap text-[#213645]">
                                {utilization.rentedPct}% / {utilization.idlePct}%
                              </span>
                              <span className="h-[5px] w-[94px] rounded-[3px] bg-[#d1e8f2]/80">
                                <span
                                  className="block h-[5px] rounded-[3px] bg-[#7ab5e0]"
                                  style={{width: `${utilization.rentedPct}%`}}
                                />
                              </span>
                            </div>
                          ) : (
                            <span className="text-[13px] text-[#8aa0ab]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[product.status] ?? statusTone.draft}`}>
                            {productStatusCopy[product.status] ?? product.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {product.status === "active" ? (
                            <Link
                              className="text-xs font-medium text-[#1a6e9e] hover:underline"
                              href={`/market/${product.id}`}
                            >
                              市场页
                            </Link>
                          ) : (
                            <span className="text-xs text-[#9cb0ba]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="点击右上角「发布算力中心」, 选择「成熟算力中心」类型提交整站资源。"
              title="还没有成熟算力中心"
            />
          )}
        </div>

        {!isPending && !isError && products.length > 0 ? (
          <div className="mt-4 flex items-center rounded-[14px] border border-white/45 bg-[#e5f5fc]/60 px-4 py-3.5">
            <p className="text-xs leading-5 text-[#5c788a]">
              “约算力”为供给方自行填报的参考值; 平台不做 GPU 算力换算与校验。已租 / 闲置按可售库存估算。
            </p>
          </div>
        ) : null}
      </GlassCard>
    </section>
  );
}
