"use client";

import {Button, Skeleton} from "@heroui/react";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {formatDate, formatDateTime} from "@/lib/format/date";
import {
  productTypeCopy,
  type SupplierProduct,
  type SupplierResourceSync,
} from "@/lib/supplier-workspace";

const iconAssets = "/images/supplier-workspace";

// Mode cards explain the two stocktake channels and the platform risk rule.
// The 30% anomaly threshold mirrors backend ComputeAnomaly (|diff|/stock_before > 0.3).
const modeCards = [
  {
    id: "active",
    icon: `${iconAssets}/refresh-cw.svg`,
    title: "主动盘",
    description: "平台发起, 机房确认",
    accent: false,
  },
  {
    id: "passive",
    icon: `${iconAssets}/upload.svg`,
    title: "被动报",
    description: "机房主动上报余量变化",
    accent: false,
  },
  {
    id: "risk",
    icon: `${iconAssets}/shield-alert.svg`,
    title: "差异风控",
    description: "差异超过 30% 标记异常并触发风控",
    accent: true,
  },
] as const;

const syncTypeCopy: Record<string, string> = {
  active: "主动盘",
  passive: "被动报",
};

function productLabel(product: SupplierProduct | undefined, productId: number) {
  if (!product) return `PRD-#${productId}`;
  const model = (product.gpu_model || productTypeCopy[product.product_type] || "算力资源")
    .replace(/^NVIDIA\s+/i, "");
  return model;
}

// Stock unit follows the product type: card rental counts GPU cards, the rest count machines.
function stockUnit(product: SupplierProduct | undefined) {
  return product?.product_type === "card_rental" ? "卡" : "台";
}

function diffLabel(sync: SupplierResourceSync) {
  const base = sync.diff > 0 ? `+${sync.diff}` : `${sync.diff}`;
  if (sync.anomaly && sync.stock_before > 0) {
    const ratio = ((sync.diff / sync.stock_before) * 100).toFixed(1);
    return `${base}(${ratio}%)`;
  }
  return base;
}

// 资源盘点视图: 模式说明卡 + 盘点记录表 (C-05)。数据全部由 page.tsx 注入。
export function SupplierInventoryView({
  errorMessage,
  isError,
  isFetching,
  isPending,
  onPageChange,
  onReport,
  onRetry,
  page,
  products,
  syncs,
  total,
  totalPages,
}: {
  errorMessage?: string;
  isError: boolean;
  isFetching: boolean;
  isPending: boolean;
  onPageChange: (page: number) => void;
  onReport: () => void;
  onRetry: () => void;
  page: number;
  products: SupplierProduct[];
  syncs: SupplierResourceSync[];
  total: number;
  totalPages: number;
}) {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0c1a25] sm:text-[30px] sm:leading-10">
            资源盘点
          </h1>
          <p className="mt-1 text-[13px] text-[#5c788a]">校验平台余量与机房真实资源</p>
        </div>
        <Button
          className="h-10 min-w-28 rounded-xl bg-[#caf842] px-5 text-sm font-semibold text-[#10202b] transition-colors hover:bg-[#b8e643]"
          onPress={onReport}
        >
          上报余量
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {modeCards.map((card) => (
          <div
            className={`flex items-center gap-3 rounded-[18px] border border-white/60 px-4 py-4 drop-shadow-[0px_5px_8px_rgba(10,41,59,0.04)] ${
              card.accent ? "bg-[#fff2d1]/50" : "bg-white/50"
            }`}
            key={card.id}
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                card.accent ? "bg-[#fff2d1]/80" : "bg-[#e4f4fb]/80"
              }`}
            >
              <img alt="" aria-hidden="true" className="size-[18px]" src={card.icon} />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[#0c1a25]">{card.title}</p>
              <p className="mt-0.5 text-xs text-[#5c788a]">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      <GlassCard className="px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-xl bg-[#e4f4fb]/80">
            <img
              alt=""
              aria-hidden="true"
              className="size-[18px]"
              src={`${iconAssets}/clipboard-check.svg`}
            />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-[#0c1a25]">盘点记录</h2>
            <p className="text-xs text-[#5c788a]">
              {isPending ? "平台与机房余量核验记录" : `共 ${total} 次平台与机房余量核验`}
            </p>
          </div>
        </div>

        <div aria-busy={isPending} className="mt-4 min-h-[320px]">
          {isPending ? (
            <div className="space-y-3">
              {["s1", "s2", "s3", "s4"].map((key) => (
                <Skeleton className="h-14 w-full rounded-xl" key={key} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              description={errorMessage}
              isPending={isFetching}
              onRetry={onRetry}
              title="盘点记录暂时不可用"
            />
          ) : syncs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
                <caption className="sr-only">资源盘点记录</caption>
                <colgroup>
                  <col className="w-[120px]" />
                  <col className="w-[190px]" />
                  <col className="w-[76px]" />
                  <col className="w-[90px]" />
                  <col className="w-[90px]" />
                  <col className="w-[130px]" />
                  <col />
                  <col className="w-[90px]" />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">时间</th>
                    <th className="px-4" scope="col">商品</th>
                    <th className="px-4" scope="col">方式</th>
                    <th className="px-4" scope="col">盘前余量</th>
                    <th className="px-4" scope="col">盘后余量</th>
                    <th className="px-4" scope="col">差异</th>
                    <th className="px-4" scope="col">原因</th>
                    <th className="rounded-r-[14px] px-4" scope="col">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {syncs.map((sync) => {
                    const product = productsById.get(sync.product_id);
                    const unit = stockUnit(product);
                    return (
                      <tr className="border-b border-[#dce9ee]/75 last:border-0" key={sync.id}>
                        <td className="px-4 py-3.5 text-[12px] leading-[18px] text-[#78909c]">
                          <p>{formatDate(sync.created_at)}</p>
                          <p>
                            {formatDateTime(sync.created_at, {
                              hour: "2-digit",
                              hourCycle: "h23",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>
                        <th className="px-4 py-3.5" scope="row">
                          <p className="truncate text-[13px] font-medium text-[#0c1a25]">
                            {productLabel(product, sync.product_id)}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#8aa0ab]">PRD-#{sync.product_id}</p>
                        </th>
                        <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                          {syncTypeCopy[sync.sync_type] ?? sync.sync_type}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-[#24495d]">
                          {sync.stock_before}{unit}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] font-medium text-[#0c1a25]">
                          {sync.stock_after}{unit}
                        </td>
                        <td
                          className={`px-4 py-3.5 text-[13px] ${
                            sync.anomaly
                              ? "font-semibold text-[#b82e2e]"
                              : "font-medium text-[#24495d]"
                          }`}
                        >
                          {diffLabel(sync)}
                        </td>
                        <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                          {sync.reason || "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              sync.anomaly
                                ? "bg-[#fdeaea] text-[#b82e2e]"
                                : "bg-[#e5f7d9] text-[#2e6933]"
                            }`}
                          >
                            {sync.anomaly ? "异常" : "正常"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="平台发起盘点或机房上报余量后, 核验记录会显示在这里。"
              title="暂无盘点记录"
            />
          )}
        </div>

        {!isPending && !isError ? (
          <div className="mt-4">
            <ListPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        ) : null}
      </GlassCard>
    </section>
  );
}
