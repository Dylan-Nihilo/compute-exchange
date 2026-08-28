"use client";

import {Skeleton} from "@heroui/react";
import Image from "next/image";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import type {
  SupplierProductGroup,
  SupplierSettlementSummary,
} from "@/lib/supplier-workspace";

const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

const iconAssets = "/images/supplier-workspace";

// 订单状态分布口径: 与订单管理页 Tab 语义保持一致(待交付 = paid + provisioning)。
const orderStatusRows = [
  {key: "pending_payment", label: "待支付", statuses: ["pending_payment"], dot: "bg-[#f0a23c]"},
  {key: "awaiting_delivery", label: "待交付", statuses: ["paid", "provisioning"], dot: "bg-[#1d63ae]"},
  {key: "active", label: "进行中", statuses: ["active"], dot: "bg-[#4c7c0f]"},
  {key: "completed", label: "已完成", statuses: ["completed"], dot: "bg-[#173447]"},
  {key: "closed", label: "已关闭", statuses: ["cancelled", "refunded", "refunding", "frozen"], dot: "bg-[#90a4ae]"},
] as const;

function KpiCard({
  icon,
  label,
  sub,
  value,
}: {
  icon: string;
  label: string;
  sub: string;
  value: string;
}) {
  return (
    <GlassCard className="flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-[#5c788a]">{label}</p>
        <span className="grid size-8 place-items-center rounded-[11px] bg-[#e4f4fb]/70">
          <Image alt="" aria-hidden height={16} src={`${iconAssets}/${icon}`} width={16} />
        </span>
      </div>
      <p className="text-[30px] font-semibold leading-[34px] text-[#0c1a25]">{value}</p>
      <p className="text-xs text-[#5c788a]">{sub}</p>
    </GlassCard>
  );
}

// 供给方数据看板: 全部指标来自商品汇总 / 订单 statusCounts / 结算汇总三个真实接口,
// 设计稿中的 30 天趋势折线无后端数据源, 以订单状态分布与结算构成替代。
export function SupplierAnalytics({
  groups,
  isError,
  isPending,
  onRetry,
  settlement,
  statusCounts,
}: {
  groups: SupplierProductGroup[];
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  settlement: SupplierSettlementSummary;
  statusCounts: Record<string, number>;
}) {
  const countOf = (statuses: readonly string[]) =>
    statuses.reduce((sum, status) => sum + (statusCounts[status] ?? 0), 0);

  const totalOrders = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const awaitingDelivery = countOf(["paid", "provisioning"]);
  const inProgress = countOf(["active"]);

  const totalProducts = groups.reduce((sum, group) => sum + group.count, 0);
  const activeProducts = groups.reduce((sum, group) => sum + group.active_count, 0);
  const totalStock = groups.reduce((sum, group) => sum + group.total_stock, 0);
  const listingRate = totalProducts > 0 ? Math.round((activeProducts / totalProducts) * 100) : null;

  const distribution = orderStatusRows
    .map((row) => ({...row, count: countOf(row.statuses)}))
    .filter((row) => row.count > 0);
  const maxOrderCount = Math.max(1, ...distribution.map((row) => row.count));

  const settledShare =
    settlement.total_fen > 0
      ? Math.round((settlement.succeeded_fen / settlement.total_fen) * 100)
      : null;

  if (isPending) {
    return (
      <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
        <Skeleton className="h-16 w-full rounded-[20px]" />
        <div className="grid gap-3 md:grid-cols-3">
          {["s1", "s2", "s3"].map((key) => <Skeleton className="h-36 w-full rounded-[20px]" key={key} />)}
        </div>
        <Skeleton className="h-72 w-full rounded-[20px]" />
        <Skeleton className="h-56 w-full rounded-[20px]" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
        <header className="flex h-16 items-center">
          <div>
            <h1 className="text-[30px] font-semibold leading-10 text-[#0c1a25]">数据看板</h1>
            <p className="text-[13px] text-[#5c788a]">汇总订单分布、商品供应与结算进度</p>
          </div>
        </header>
        <GlassCard className="min-h-[360px] px-5 py-5 sm:px-6">
          <ErrorState
            isPending={false}
            onRetry={onRetry}
            title="看板数据暂时不可用"
          />
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <header className="flex h-16 items-center">
        <div>
          <h1 className="text-[30px] font-semibold leading-10 text-[#0c1a25]">数据看板</h1>
          <p className="text-[13px] text-[#5c788a]">汇总订单分布、商品供应与结算进度</p>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          icon="chart-no-axes-combined.svg"
          label="订单总量"
          sub={`待交付 ${awaitingDelivery} 笔 · 进行中 ${inProgress} 笔`}
          value={String(totalOrders)}
        />
        <KpiCard
          icon="wallet-cards.svg"
          label="待结算金额"
          sub={`累计应结 ${money.format(settlement.total_fen / 100)}`}
          value={money.format(settlement.pending_fen / 100)}
        />
        <KpiCard
          icon="package-search.svg"
          label="商品上架率"
          sub={
            totalProducts > 0
              ? `在售 ${activeProducts} / 共 ${totalProducts} 个商品 · 库存 ${totalStock}`
              : "还没有发布商品"
          }
          value={listingRate === null ? "—" : `${listingRate}%`}
        />
      </div>

      <GlassCard className="px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-[#173447]">订单与结算概览</h2>
            <p className="mt-1 text-xs text-[#78909c]">订单状态分布与结算金额构成</p>
          </div>
        </div>

        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-[13px] font-medium text-[#5c788a]">订单状态分布</h3>
            {distribution.length ? (
              <ul className="mt-4 space-y-3.5">
                {distribution.map((row) => (
                  <li className="flex items-center gap-3" key={row.key}>
                    <span className={`size-2.5 shrink-0 rounded-full ${row.dot}`} />
                    <span className="w-16 shrink-0 text-xs text-[#213645]">{row.label}</span>
                    <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#dce9ee]/60">
                      <span
                        className="block h-full rounded-full bg-[#1a6e9e]"
                        style={{width: `${Math.max(4, Math.round((row.count / maxOrderCount) * 100))}%`}}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right text-[13px] font-semibold text-[#173447]">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 min-h-[160px]">
                <EmptyState
                  description="买家下单并支付后, 订单分布会显示在这里。"
                  title="暂时没有订单"
                />
              </div>
            )}
          </div>

          <div>
            <h3 className="text-[13px] font-medium text-[#5c788a]">结算金额构成</h3>
            {settlement.total_fen > 0 ? (
              <div className="mt-4 space-y-4">
                <div
                  aria-label={`已分账 ${settledShare ?? 0}%`}
                  className="flex h-3.5 overflow-hidden rounded-full bg-[#dce9ee]/60"
                  role="img"
                >
                  <span
                    className="block h-full bg-[#4c7c0f]"
                    style={{width: `${settledShare ?? 0}%`}}
                  />
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <span className="size-2.5 shrink-0 rounded-full bg-[#4c7c0f]" />
                    <span className="flex-1 text-xs text-[#213645]">已分账</span>
                    <span className="text-[13px] font-semibold text-[#173447]">
                      {money.format(settlement.succeeded_fen / 100)}
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="size-2.5 shrink-0 rounded-full bg-[#f0a23c]" />
                    <span className="flex-1 text-xs text-[#213645]">待结算</span>
                    <span className="text-[13px] font-semibold text-[#173447]">
                      {money.format(settlement.pending_fen / 100)}
                    </span>
                  </li>
                  <li className="flex items-center gap-3 border-t border-[#dce9ee]/75 pt-3">
                    <span className="flex-1 text-xs text-[#5c788a]">累计应结</span>
                    <span className="text-[13px] font-semibold text-[#173447]">
                      {money.format(settlement.total_fen / 100)}
                    </span>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="mt-4 min-h-[160px]">
                <EmptyState
                  description="订单完成交付后, 结算金额会显示在这里。"
                  title="暂时没有结算记录"
                />
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">商品供应结构</h2>
        <p className="mt-1 text-xs text-[#78909c]">各类型商品的在售占比与库存</p>
        {groups.length ? (
          <ul className="mt-5 space-y-4">
            {groups.map((group) => {
              const activeRate = group.count > 0 ? Math.round((group.active_count / group.count) * 100) : 0;
              return (
                <li key={group.product_type}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-medium text-[#213645]">{group.label}</p>
                    <p className="text-xs text-[#78909c]">
                      在售 {group.active_count} / {group.count} · 库存 {group.total_stock}
                      {group.total_card > 0 ? ` · ${group.total_card} 卡` : ""}
                      {group.total_machine > 0 ? ` · ${group.total_machine} 台` : ""}
                    </p>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#dce9ee]/60">
                    <span
                      className="block h-full rounded-full bg-[#1a6e9e]"
                      style={{width: `${group.count > 0 ? Math.max(2, activeRate) : 0}%`}}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 min-h-[160px]">
            <EmptyState
              description="发布商品并通过审核后, 供应结构会显示在这里。"
              title="还没有商品"
            />
          </div>
        )}
      </GlassCard>
    </section>
  );
}
