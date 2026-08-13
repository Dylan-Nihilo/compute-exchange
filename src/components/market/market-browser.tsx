"use client";

import {Button, Card, Chip} from "@heroui/react";
import {EmptyState} from "@heroui-pro/react/empty-state";
import {useRouter} from "next/navigation";

import type {MarketSupply} from "@/components/market/market-data";

const priceFormatter = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 2,
  style: "currency",
});

export function MarketBrowser({supplies}: {supplies: readonly MarketSupply[]}) {
  if (!supplies.length) {
    return (
      <div className="rounded-[22px] border border-white/70 bg-white/80 shadow-[0_16px_36px_rgba(6,37,59,0.06)] backdrop-blur-xl">
        <EmptyState className="py-16" size="lg">
          <EmptyState.Header>
            <EmptyState.Title>暂无匹配供给</EmptyState.Title>
            <EmptyState.Description>
              请调整 GPU 型号、地域、计费模式或价格区间。
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {supplies.map((supply) => (
        <MarketOfferCard key={supply.id} supply={supply} />
      ))}
    </div>
  );
}

function MarketOfferCard({supply}: {supply: MarketSupply}) {
  const router = useRouter();
  const unitLabel = supply.unitLabel === "GPU" ? "卡" : supply.unitLabel ?? "卡";
  const price =
    supply.unitPriceMinor === undefined
      ? supply.unitPrice
      : priceFormatter.format(supply.unitPriceMinor / 100);
  const priceUnit = marketPriceUnit(supply.pricingMode, unitLabel);
  const provider = supply.selfOperated
    ? "平台集采"
    : supply.supplierId
      ? `供给方 #${supply.supplierId}`
      : "供给方待确认";

  return (
    <Card
      aria-label={`${supply.name} 算力商品`}
      className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/82 p-0 shadow-[0_16px_36px_rgba(6,37,59,0.08)] backdrop-blur-xl"
      role="article"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-full bg-linear-to-r from-transparent via-transparent to-[#d9edf3]/35 xl:w-[263px]"
      />
      <div className="relative grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_228px] xl:gap-8 xl:p-8">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[340px_396px_172px] xl:gap-6">
            <div className="min-w-0">
              <div className="flex h-7 flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-[#244b61]">
                  {supply.productTypeLabel ?? "算力供给"}
                </span>
                {supply.selfOperated ? (
                  <Chip className="bg-[#e3f1f5] text-[#1c526b]" size="sm" variant="soft">
                    平台自营
                  </Chip>
                ) : null}
              </div>
              <h2 className="truncate text-[22px] leading-[30px] font-semibold text-[#102b3b]">
                {supply.gpuModel || supply.name}
              </h2>
              <p className="mt-0.5 truncate text-sm leading-[22px] text-[#496777]">
                {primarySpecs(supply, unitLabel)}
              </p>
              <p className="mt-0.5 truncate text-[13px] leading-5 font-medium text-[#173447]">
                起订 {supply.minimumOrder ?? 1} {unitLabel} · 最短 {supply.minimumDuration ?? 1} {durationLabel(supply.pricingMode)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Metric label="地域" meta="可用节点" value={supply.region || "—"} />
              <Metric
                label="可售"
                meta={supply.availableHours || "时段待确认"}
                metaClassName={supply.availableUnits <= 4 ? "text-[#c8553d]" : "text-[#43875b]"}
                value={`${supply.availableUnits} ${unitLabel}`}
              />
              <Metric label="信用" meta="暂无评分" value="—" />
            </div>

            <div className="min-w-0 pt-2">
              <Chip className="bg-[#e7f2f5] text-[#24546b]" size="sm" variant="soft">
                {supply.deliveryMode}
              </Chip>
              <p className="mt-2 truncate text-[13px] leading-5 font-medium text-[#31566a]">
                {provider} · {supply.region}
              </p>
              <p className="mt-1 truncate text-[13px] leading-5 text-[#5f7888]">
                {supply.deliveryMode}交付
              </p>
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-2 rounded-[13px] bg-[#e7f3f6]/70 px-4 py-3 text-[13px] leading-5 text-[#456579] sm:grid-cols-2 xl:grid-cols-4 xl:py-3">
            <Spec label="CPU" value={supply.cpuSpec} />
            <Spec label="内存" value={supply.memorySpec} />
            <Spec label="存储" value={supply.storageSpec} />
            <Spec label="带宽" value={supply.network} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col border-t border-[#dcebef] pt-5 xl:border-0 xl:pt-1">
          <div className="flex items-baseline gap-1.5">
            <p className="truncate text-[32px] leading-[38px] font-semibold tabular-nums text-[#102b3b]">
              {price}
            </p>
            {priceUnit ? (
              <p className="shrink-0 text-[13px] text-[#5f7888]">/ {priceUnit}</p>
            ) : null}
          </div>
          <Button
            className="mt-2 h-11 w-full rounded-xl border border-[#ddf3a8]/70 bg-[#c4ec68] text-[#112b31] shadow-[0_6px_14px_rgba(125,171,54,0.16)] hover:bg-[#b9e35c]"
            onPress={() => router.push(`/market/${encodeURIComponent(supply.id)}`)}
          >
            查看详情
          </Button>
          <p className="mt-2 text-center text-xs leading-[18px] text-[#657f8f]">
            查看可售时段与交付条件
          </p>
        </div>
      </div>
    </Card>
  );
}

function Metric({
  label,
  meta,
  metaClassName = "text-[#5f7888]",
  value,
}: {
  label: string;
  meta: string;
  metaClassName?: string;
  value: string;
}) {
  return (
    <div className="min-w-0 pt-3.5">
      <p className="text-xs leading-[18px] text-[#688495]">{label}</p>
      <p className="truncate text-lg leading-[26px] font-semibold tabular-nums text-[#102b3b]">
        {value}
      </p>
      <p className={`truncate text-xs leading-[18px] ${metaClassName}`}>{meta}</p>
    </div>
  );
}

function Spec({label, value}: {label: string; value?: string}) {
  return (
    <p className="truncate">
      <span className="mr-2 text-[#688495]">{label}</span>
      {value || "—"}
    </p>
  );
}

function primarySpecs(supply: MarketSupply, unitLabel: string) {
  return [
    `${supply.cardCount || supply.totalUnits} ${unitLabel}`,
    supply.memorySpec,
    supply.totalPflopsApprox ? `总算力 ${supply.totalPflopsApprox}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function durationLabel(pricingMode?: string) {
  return {
    daily: "天",
    hourly: "小时",
    monthly: "月",
    perpetual: "期",
    weekly: "周",
  }[pricingMode ?? ""] ?? "期";
}

function marketPriceUnit(pricingMode: string | undefined, unitLabel: string) {
  if (!pricingMode || pricingMode === "perpetual") return "";
  return `${unitLabel}·${durationLabel(pricingMode).replace("小时", "时")}`;
}
