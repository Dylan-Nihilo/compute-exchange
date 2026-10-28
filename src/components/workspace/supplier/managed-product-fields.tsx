"use client";

import {useId} from "react";

import {cardSplitOptions} from "@/lib/domain/contracts";
import {
  formatMinuteOfDay,
  formatNightWindow,
  halfHourOptions,
  rentalPeriodUnits,
  rentalPricingModeLabels,
  type RentalPricingMode,
} from "@/lib/flexible-pricing";
import {
  fulltimeModes,
  type ManagedErrors,
  type ManagedProductState,
  type PriceRowState,
} from "@/lib/managed-product";

const fieldInputClass = (error?: string) =>
  `h-10 w-full rounded-xl border bg-white/80 px-3 text-sm text-[#24495d] outline-none focus-visible:ring-2 focus-visible:ring-[#5f8fa3]/25 ${
    error ? "border-[#cf6f67] bg-[#fff8f7]" : "border-[#afc4ce]/45 focus:border-[#5f8fa3]"
  }`;

export function ManagedProductFields({
  deliveryMode,
  errors,
  onChange,
  state,
}: {
  deliveryMode: string;
  errors: ManagedErrors;
  onChange: (next: ManagedProductState) => void;
  state: ManagedProductState;
}) {
  const id = useId();
  const nightly = state.availability === "night_window";
  const modes: readonly RentalPricingMode[] = nightly ? ["nightly"] : fulltimeModes;
  const setPrice = (mode: RentalPricingMode, patch: Partial<PriceRowState>) =>
    onChange({...state, prices: {...state.prices, [mode]: {...state.prices[mode], ...patch}}});
  const setAvailability = (availability: ManagedProductState["availability"]) =>
    onChange({
      ...state,
      availability,
      prices: availability === "night_window"
        ? {...state.prices, nightly: {...state.prices.nightly, enabled: true}}
        : state.prices,
    });

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-[13px] font-medium text-[#24495d]">可用时段 *</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {([["fulltime", "全天可租"], ["night_window", "夜间窗口（包夜）"]] as const).map(([value, label]) => (
            <SmallChip active={state.availability === value} key={value} label={label} onClick={() => setAvailability(value)} />
          ))}
        </div>
        {nightly ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([["nightStartMin", "每晚开始"], ["nightEndMin", "次日结束"]] as const).map(([key, label]) => (
              <label className="flex flex-col gap-1.5 text-xs text-[#5e7786]" key={key}>
                {label}（北京时间）
                <select
                  aria-describedby={errors.night ? `${id}-night-error` : undefined}
                  aria-invalid={Boolean(errors.night)}
                  className={fieldInputClass(errors.night)}
                  id={key === "nightStartMin" ? "product-night" : undefined}
                  onChange={(event) => onChange({...state, [key]: Number(event.target.value)})}
                  value={state[key]}
                >
                  {halfHourOptions.map((minute) => (
                    <option key={minute} value={minute}>{formatMinuteOfDay(minute)}</option>
                  ))}
                </select>
              </label>
            ))}
            <p className="text-xs text-[#5e7786] sm:col-span-2">
              当前窗口：{formatNightWindow(state.nightStartMin, state.nightEndMin)}
            </p>
            {errors.night ? <p className="text-xs text-[#b54d45] sm:col-span-2" id={`${id}-night-error`} role="alert">{errors.night}</p> : null}
          </div>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-[13px] font-medium text-[#24495d]">计费方式与单价 *</legend>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <caption className="sr-only">各计费方式的单价与最短租期</caption>
            <thead className="text-xs text-[#78909c]">
              <tr><th className="py-2 pr-3 font-medium" scope="col">启用</th><th className="py-2 pr-3 font-medium" scope="col">单价（元 / 卡·周期）</th><th className="py-2 font-medium" scope="col">最短租期</th></tr>
            </thead>
            <tbody className="divide-y divide-[#dce9ee]">
              {modes.map((mode, index) => {
                const row = state.prices[mode];
                return (
                  <tr key={mode}>
                    <th className="py-2.5 pr-3 font-normal" scope="row">
                      <label className="flex items-center gap-2 text-[#24495d]">
                        <input
                          checked={row.enabled}
                          className="size-4 accent-[#173447]"
                          disabled={nightly}
                          id={index === 0 ? "product-prices" : undefined}
                          onChange={(event) => setPrice(mode, {enabled: event.target.checked})}
                          type="checkbox"
                        />
                        {rentalPricingModeLabels[mode]}
                      </label>
                    </th>
                    <td className="py-2.5 pr-3">
                      <input
                        aria-label={`${rentalPricingModeLabels[mode]}单价（元 / 卡·${rentalPeriodUnits[mode]}）`}
                        className={fieldInputClass()}
                        disabled={!row.enabled}
                        inputMode="decimal"
                        onChange={(event) => setPrice(mode, {price: event.target.value.replace(/[^\d.]/g, "")})}
                        placeholder="0.00"
                        value={row.price}
                      />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <input
                          aria-label={`${rentalPricingModeLabels[mode]}最短租期（${rentalPeriodUnits[mode]}）`}
                          className={`${fieldInputClass()} w-20`}
                          disabled={!row.enabled}
                          inputMode="numeric"
                          onChange={(event) => setPrice(mode, {minDuration: event.target.value.replace(/\D/g, "")})}
                          value={row.minDuration}
                        />
                        <span className="text-xs text-[#78909c]">{rentalPeriodUnits[mode]}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {errors.prices ? <p className="mt-1.5 text-xs text-[#b54d45]" role="alert">{errors.prices}</p> : null}
      </fieldset>

      {deliveryMode === "container" ? (
        <fieldset>
          <legend className="text-[13px] font-medium text-[#24495d]">买家可选卡数 *</legend>
          <p className="mt-1 text-xs text-[#5e7786]">每个订单的卡分配在同一台节点内，按每卡单价 × 卡数计费。</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {cardSplitOptions.map((option, index) => (
              <label className="flex items-center gap-1.5 text-sm text-[#24495d]" key={option}>
                <input
                  checked={state.splitOptions.includes(option)}
                  className="size-4 accent-[#173447]"
                  id={index === 0 ? "product-split" : undefined}
                  onChange={(event) => onChange({
                    ...state,
                    splitOptions: event.target.checked
                      ? [...state.splitOptions, option].sort((a, b) => a - b)
                      : state.splitOptions.filter((value) => value !== option),
                  })}
                  type="checkbox"
                />
                {option} 卡
              </label>
            ))}
          </div>
          {errors.split ? <p className="mt-1.5 text-xs text-[#b54d45]" role="alert">{errors.split}</p> : null}
        </fieldset>
      ) : (
        <p className="text-xs text-[#5e7786]">裸金属交付按整机出租，买家不可分卡。</p>
      )}

      <p className="rounded-xl border border-[#dce9ee] bg-white/45 px-4 py-3 text-xs leading-5 text-[#5e7786]">
        托管商品的可售库存由平台按探活通过节点的空闲卡自动计算；上架审核需要至少一台关联本商品且探活通过的节点（在「节点管理」中接入）。
      </p>
    </div>
  );
}

function SmallChip({active, label, onClick}: {active: boolean; label: string; onClick: () => void}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5f8fa3] focus-visible:ring-offset-2 ${
        active ? "bg-[#173447] text-white" : "border border-[#dce9ee] bg-white/60 text-[#5e7786] hover:border-[#afc4ce] hover:bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
