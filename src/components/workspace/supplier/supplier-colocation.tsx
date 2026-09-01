"use client";

import {Skeleton} from "@heroui/react";
import Image from "next/image";
import Link from "next/link";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {
  pricingModeCopy,
  productStatusCopy,
  type SupplierProduct,
  type SupplierProductGroup,
} from "@/lib/supplier-workspace";

const assets = "/images/supplier-workspace";

const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

const integer = new Intl.NumberFormat("zh-CN");

const statusTone: Record<string, string> = {
  draft: "bg-[#edf1f3] text-[#78909c]",
  pending: "bg-[#fff3e0] text-[#b25e09]",
  active: "bg-[#e5f7d9] text-[#4c7c0f]",
  sold_out: "bg-[#fff3e0] text-[#b25e09]",
  offline: "bg-[#edf1f3] text-[#78909c]",
  frozen: "bg-[#fdeaea] text-[#c4392f]",
};

// Column template shared by the facility table header and rows.
const facilityGrid =
  "grid grid-cols-[minmax(150px,1.3fr)_90px_104px_70px_70px_70px_90px_96px_90px_84px] items-center gap-x-2 px-4";

// Occupancy model for colocation: stock is the number of vacant racks,
// so occupied = rack_count - stock (clamped to sane bounds).
function occupancyOf(product: SupplierProduct) {
  const racks = product.rack_count ?? 0;
  const vacant = Math.min(Math.max(product.stock, 0), racks);
  return {occupied: racks - vacant, racks, vacant};
}

function KpiCard({
  icon,
  label,
  sublabel,
  tint,
  value,
}: {
  icon: string;
  label: string;
  sublabel: string;
  tint: string;
  value: string;
}) {
  return (
    <div className="relative flex min-w-0 flex-col gap-2 rounded-[18px] border border-white/30 bg-[#f8fcfe]/80 p-5 shadow-[0px_10px_24px_-10px_rgba(9,38,59,0.08)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[#5c788a]">{label}</p>
        <span className={`grid size-8 shrink-0 place-items-center rounded-[11px] border border-white/50 ${tint}`}>
          <Image alt="" aria-hidden="true" height={16} src={icon} width={16} />
        </span>
      </div>
      <div>
        <p className="text-[28px] leading-10 font-semibold text-[#0c1a25]">{value}</p>
        <p className="mt-1 text-xs text-[#5c788a]">{sublabel}</p>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_1px_1px_rgba(255,255,255,0.86)]"
      />
    </div>
  );
}

function CooperationCell({product}: {product: SupplierProduct}) {
  if (product.price_negotiable) {
    return (
      <span className="inline-flex h-7 items-center rounded-full border border-white/50 bg-[#fff1d1]/80 px-3 text-xs font-medium text-[#b0631a]">
        面议
      </span>
    );
  }
  return (
    <span className="text-[13px] text-[#213645]">
      {money.format(product.unit_price / 100)}
      <span className="text-[#5c788a]">/{pricingModeCopy[product.pricing_mode] ?? product.pricing_mode}</span>
    </span>
  );
}

function FacilityRow({product}: {product: SupplierProduct}) {
  const {occupied, racks, vacant} = occupancyOf(product);
  const kw = product.power_capacity_kw;
  const perRackKw = kw && racks > 0 ? Math.round(kw / racks) : null;

  return (
    <div
      className={`${facilityGrid} relative h-[76px] rounded-[14px] border border-white/50 bg-white/45 shadow-[0px_4px_12px_rgba(9,38,59,0.03),inset_0px_1px_1px_rgba(255,255,255,0.62)]`}
    >
      <p className="truncate text-sm font-medium text-[#0c1a25]">空心机房 #{product.id}</p>
      <p className="truncate text-[13px] text-[#213645]">{product.region || "—"}</p>
      <p className="text-[13px] font-medium text-[#213645]">{kw ? `${integer.format(kw)} kW` : "—"}</p>
      <p className="text-[13px] font-medium text-[#213645]">{racks > 0 ? integer.format(racks) : "—"}</p>
      <p className="text-[13px] font-medium text-[#213645]">{racks > 0 ? integer.format(occupied) : "—"}</p>
      <p className="text-[13px] text-[#213645]">{racks > 0 ? integer.format(vacant) : "—"}</p>
      <p className="text-[13px] text-[#213645]">{perRackKw ? `${integer.format(perRackKw)} kW` : "—"}</p>
      <div><CooperationCell product={product} /></div>
      <div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[product.status] ?? statusTone.draft}`}
        >
          {productStatusCopy[product.status] ?? product.status}
        </span>
      </div>
      <div className="flex justify-end">
        <Link
          className="inline-flex h-9 items-center justify-center rounded-xl border border-[#afc4ce]/30 bg-[#fbfdfe]/70 px-4 text-sm font-medium text-[#10202b] shadow-[inset_0px_1px_1px_rgba(255,255,255,0.7)] transition-colors hover:bg-white"
          href="/console/supplier/products"
        >
          管理
        </Link>
      </div>
    </div>
  );
}

// P18 空心机房: KPI(机柜/入驻/电力) + 机房明细列表, 数据来自商品汇总中 product_type=colocation 的组。
export function SupplierColocation({
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
  const products = group?.products ?? [];

  const totalRacks = products.reduce((sum, product) => sum + (product.rack_count ?? 0), 0);
  const totalVacant = products.reduce((sum, product) => sum + occupancyOf(product).vacant, 0);
  const totalOccupied = totalRacks - totalVacant;
  const totalKw = products.reduce((sum, product) => sum + (product.power_capacity_kw ?? 0), 0);
  // Used power is estimated by allocating each facility's contracted capacity
  // proportionally to its occupied racks.
  const usedKw = products.reduce((sum, product) => {
    const kw = product.power_capacity_kw ?? 0;
    const {occupied, racks} = occupancyOf(product);
    return racks > 0 ? sum + (kw * occupied) / racks : sum;
  }, 0);
  const vacancyRate = totalRacks > 0 ? (totalVacant / totalRacks) * 100 : 0;
  const usageRate = totalKw > 0 ? (usedKw / totalKw) * 100 : 0;

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-4 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-10 font-semibold text-[#0c1a25] sm:text-[30px]">空心机房</h1>
          <p className="mt-0.5 text-[13px] text-[#5c788a]">管理机柜、电力容量与招商合作状态</p>
        </div>
        <Link
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#caf842] px-5 text-sm font-medium text-[#10202b] transition-colors hover:bg-[#b8e63d]"
          href="/console/supplier/products/new"
        >
          发布空心机房
        </Link>
      </header>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["k1", "k2", "k3", "k4"].map((key) => (
            <Skeleton className="h-[136px] w-full rounded-[18px]" key={key} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={`${assets}/server.svg`}
            label="机柜总数"
            sublabel={`个 · 共 ${products.length} 个机房`}
            tint="bg-[#dbf2fa]/85"
            value={integer.format(totalRacks)}
          />
          <KpiCard
            icon={`${assets}/layers.svg`}
            label="已入驻 / 空置"
            sublabel={`空置率 ${vacancyRate.toFixed(1)}%`}
            tint="bg-[#e8f2f7]/85"
            value={`${integer.format(totalOccupied)} / ${integer.format(totalVacant)}`}
          />
          <KpiCard
            icon={`${assets}/gauge.svg`}
            label="电力容量"
            sublabel="总签约容量"
            tint="bg-[#dbf2fa]/90"
            value={`${integer.format(totalKw)} kW`}
          />
          <KpiCard
            icon={`${assets}/chart-no-axes-combined-16.svg`}
            label="电力使用率"
            sublabel={`约 ${integer.format(Math.round(usedKw))} / ${integer.format(totalKw)} kW`}
            tint="bg-[#edf7d6]/75"
            value={`${Math.round(usageRate)}%`}
          />
        </div>
      )}

      <section className="relative overflow-clip rounded-[22px] border border-white/30 bg-[#f8fcfe]/85 px-5 py-5 shadow-[0px_10px_24px_-12px_rgba(9,38,59,0.09)] backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-[34px] shrink-0 place-items-center rounded-xl bg-[#e4f4fb]/75">
            <Image alt="" aria-hidden="true" height={18} src={`${assets}/building-2.svg`} width={18} />
          </span>
          <div>
            <h2 className="text-lg leading-[26px] font-semibold text-[#0c1a25]">空心机房列表</h2>
            <p className="text-xs text-[#5c788a]">按机柜、电力与招商状态管理机房</p>
          </div>
        </div>

        <div aria-busy={isPending} className="mt-3 min-h-[200px]">
          {isPending ? (
            <div className="space-y-2">
              {["r1", "r2", "r3"].map((key) => (
                <Skeleton className="h-[76px] w-full rounded-[14px]" key={key} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              description={error}
              isPending={isFetching}
              onRetry={onRetry}
              title="机房数据暂时不可用"
            />
          ) : products.length ? (
            <div className="omnis-scrollbar-x">
              <div className="flex min-w-[1010px] flex-col gap-1" role="table" aria-label="空心机房列表">
                <div className={`${facilityGrid} h-11 rounded-[14px] bg-[#e4f4fb]/55 text-xs font-medium text-[#213645]`} role="row">
                  <p role="columnheader">机房名称</p>
                  <p role="columnheader">地域</p>
                  <p role="columnheader">电力容量</p>
                  <p role="columnheader">机柜数</p>
                  <p role="columnheader">已入驻</p>
                  <p role="columnheader">空置</p>
                  <p role="columnheader">单柜功率</p>
                  <p role="columnheader">合作方式</p>
                  <p role="columnheader">状态</p>
                  <p className="text-right" role="columnheader">操作</p>
                </div>
                {products.map((product) => (
                  <FacilityRow key={product.id} product={product} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              description="点击右上角「发布空心机房」登记第一个机房资源。"
              title="还没有空心机房"
            />
          )}
        </div>

        <div className="mt-3 flex items-center rounded-[14px] border border-white/50 bg-[#e5f5fc]/70 px-4 py-3.5">
          <p className="text-xs leading-5 text-[#5c788a]">
            空心机房一律面议，不进入在线下单；买方通过“询价”联系供给方。
          </p>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0px_1px_1px_rgba(255,255,255,0.8)]"
        />
      </section>
    </section>
  );
}
