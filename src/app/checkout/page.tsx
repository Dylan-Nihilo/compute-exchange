"use client";

import {ProductHealth} from "@/components/market/product-health";
import {LegalLink} from "@/components/legal/legal-link";

import {useMutation, useQuery} from "@tanstack/react-query";
import {Button, Card, Chip, Skeleton, Spinner} from "@heroui/react";
import Link from "next/link";
import {useRouter, useSearchParams} from "next/navigation";
import {Suspense, useMemo, useState} from "react";

import {OptionChips} from "@/components/managed/option-chips";
import {SectionQueryState, useDebouncedValue} from "@/components/managed/query-states";
import {ErrorState, LoadingState} from "@/components/system/operation-state";
import {useCurrentAccount} from "@/lib/auth/queries";
import {
  addDays,
  fetchNightCalendar,
  fetchProductAvailability,
  formatNightWindow,
  maxDurationByPricingMode,
  NIGHT_BOOKING_HORIZON_DAYS,
  rentalPeriodUnits,
  rentalPricingModeLabels,
  shanghaiDate,
  type RentalPricingMode,
} from "@/lib/flexible-pricing";
import {useAuthStore} from "@/lib/auth/store";
import {
  calcOrderPreview,
  getMarketProduct,
  getTradingConfig,
  placeOrder,
} from "@/lib/market-api";
import {notify} from "@/lib/notify";

const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product")?.trim() ?? "";
  const {data: account} = useCurrentAccount();
  const beginRoleSwitch = useAuthStore((state) => state.beginRoleSwitch);

  const productQuery = useQuery({
    enabled: Boolean(productId),
    queryKey: ["market", "product", productId],
    queryFn: () => getMarketProduct(productId),
  });
  const product = productQuery.data ?? null;
  const policyQuery = useQuery({queryKey: ["trading-config"], queryFn: () => getTradingConfig(), staleTime: 0, refetchInterval: 30_000});
  const policy = policyQuery.data;

  const [quantity, setQuantity] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [pricingModeChoice, setPricingModeChoice] = useState<RentalPricingMode | null>(null);
  const [nightStartChoice, setNightStartChoice] = useState<string | null>(null);

  // v1.2: multi-price / card-split / managed fields are only present when the backend sends them.
  const prices = product?.prices ?? [];
  const selectedPrice = prices.find((price) => price.pricingMode === pricingModeChoice) ?? prices[0] ?? null;
  const splitOptions = product?.cardSplitOptions ?? [];
  const managed = product?.fulfillmentMode === "managed";
  const nightly = selectedPrice?.pricingMode === "nightly";
  const unitPriceMinor = selectedPrice ? selectedPrice.unitPriceMinor : product?.unitPriceMinor;

  const minOrder = splitOptions[0] ?? product?.minimumOrder ?? 1;
  const minDuration = selectedPrice?.minDuration ?? product?.minimumDuration ?? 1;
  const maxDuration = selectedPrice ? maxDurationByPricingMode[selectedPrice.pricingMode] : undefined;
  const maxQuantity = splitOptions.length && typeof product?.maxFreePerNode === "number"
    ? product.maxFreePerNode
    : (product?.availableUnits ?? 1);
  const isPerpetual = !selectedPrice && product?.pricingMode === "perpetual";
  const effectiveQuantity = splitOptions.length
    ? (splitOptions.find((option) => option === quantity) ?? minOrder)
    : (quantity ?? minOrder);
  const effectiveDuration = isPerpetual
    ? 1
    : Math.min(Math.max(duration ?? minDuration, minDuration), maxDuration ?? Number.MAX_SAFE_INTEGER);

  const today = shanghaiDate();
  const calendarQuery = useQuery({
    enabled: Boolean(product && nightly),
    queryKey: ["market", "night-calendar", productId, effectiveQuantity, today],
    queryFn: () => fetchNightCalendar(productId, {cards: effectiveQuantity, from: today}),
    retry: false,
    staleTime: 30_000,
  });
  const calendar = useMemo(() => calendarQuery.data ?? [], [calendarQuery.data]);
  const nightStartDate = nightly
    ? calendar.find((day) => day.night_date === nightStartChoice && day.max_cards >= effectiveQuantity)?.night_date
    : undefined;

  const availabilityInput = useDebouncedValue(
    managed && selectedPrice && (!nightly || nightStartDate)
      ? {pricingMode: selectedPrice.pricingMode, cards: effectiveQuantity, duration: effectiveDuration, nightStartDate}
      : null,
    450,
  );
  const availabilityQuery = useQuery({
    enabled: Boolean(product && availabilityInput),
    queryKey: ["market", "availability", productId, availabilityInput],
    queryFn: () => fetchProductAvailability(productId, availabilityInput!),
    retry: false,
    staleTime: 15_000,
  });
  const availability = availabilityQuery.data;
  const quote = availability?.available ? availability.quote ?? null : null;

  const preview = useMemo(() => {
    if (!unitPriceMinor || !policy) return null;
    try { return calcOrderPreview(unitPriceMinor, effectiveQuantity, effectiveDuration, policy.fee_rate); }
    catch { return null; }
  }, [unitPriceMinor, policy, effectiveQuantity, effectiveDuration]);
  const totalMinor = quote ? quote.total_amount : preview?.totalMinor;
  const feeMinor = quote ? quote.platform_fee : preview?.feeMinor;
  const feeRate = quote ? quote.fee_rate : policy?.fee_rate;
  const unavailable = availability?.available === false;
  const awaitingNight = nightly && !nightStartDate;

  const orderMutation = useMutation({
    mutationFn: () =>
      placeOrder({
        product_id: Number(product!.id),
        quantity: effectiveQuantity,
        duration: effectiveDuration,
        compliance_agreed: agreed,
        ...(selectedPrice ? {pricing_mode: selectedPrice.pricingMode} : {}),
        ...(nightStartDate ? {night_start_date: nightStartDate} : {}),
      }),
    onSuccess: (result) => {
      notify.success(`下单成功(${result.order_no}), 请在 15 分钟内完成支付`);
      const target = `/console/buyer/orders/${result.order_no}`;
      if (account) beginRoleSwitch("buyer", account.roles, target);
      // beginRoleSwitch 只更新 store; 本页不在 console layout 内,
      // AccessBoundary 不会消费 roleSwitchTarget, 必须自己跳转。
      router.push(target);
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "下单失败"),
  });

  if (!productId) {
    return (
      <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4 py-16 text-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">未选择商品</h1>
          <p className="mt-2 text-sm text-muted">请从算力市场选择商品后再确认订单。</p>
          <Button className="mt-5" onPress={() => router.push("/market")} variant="primary">
            前往算力市场
          </Button>
        </div>
      </main>
    );
  }

  if (productQuery.isPending) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (productQuery.isError) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorState
          description={productQuery.error instanceof Error ? productQuery.error.message : undefined}
          isPending={productQuery.isFetching}
          onRetry={() => void productQuery.refetch()}
          title="商品信息暂时不可用"
        />
      </main>
    );
  }

  if (!product || product.status !== "active") {
    return (
      <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4 py-16 text-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">商品不可下单</h1>
          <p className="mt-2 text-sm text-muted">该商品不存在或已下架, 请返回市场重新选择。</p>
          <Button className="mt-5" onPress={() => router.push("/market")} variant="outline">
            返回算力市场
          </Button>
        </div>
      </main>
    );
  }

  if (!unitPriceMinor) {
    return (
      <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl place-items-center px-4 py-16 text-center">
        <div>
          <h1 className="text-xl font-semibold text-foreground">该商品仅支持面议</h1>
          <p className="mt-2 text-sm text-muted">
            {product.productType === "colocation"
              ? "空心机房资源仅支持询价, 暂不提供在线下单。"
              : "该商品价格为面议, 请与平台联系获取报价。"}
          </p>
          <Button className="mt-5" onPress={() => router.push(`/market/${product.id}`)} variant="outline">
            返回商品详情
          </Button>
        </div>
      </main>
    );
  }

  const durationUnitLabel = selectedPrice ? rentalPeriodUnits[selectedPrice.pricingMode] : product.durationUnit;
  const priceLabel = selectedPrice
    ? `${money.format(selectedPrice.unitPriceMinor / 100)} / 卡·${rentalPeriodUnits[selectedPrice.pricingMode]}`
    : `${product.unitPrice} / ${product.priceUnit}`;
  const submitBlocked = !agreed || maxQuantity < minOrder || totalMinor === undefined || !policy?.trading_enabled ||
    policyQuery.isError || product.health === "offline" || unavailable || awaitingNight;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">确认订单</h1>
      <p className="mt-1 text-sm text-muted">核对资源规格与费用试算, 提交后请在 15 分钟内完成支付。</p>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <Card.Header>
            <Card.Title>{product.name}</Card.Title>
            <Card.Description>
              {product.productTypeLabel} · {product.region} · {product.deliveryMode}
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <Spec label="GPU 型号" value={product.gpuModel || "—"} />
              <Spec label="CPU" value={product.cpuSpec || "—"} />
              <Spec label="内存" value={product.memorySpec || "—"} />
              <Spec label="存储" value={product.storageSpec || "—"} />
              <Spec
                label="可售时段"
                value={product.nightWindow
                  ? `每晚 ${formatNightWindow(product.nightWindow.startMin, product.nightWindow.endMin)}`
                  : product.availableHours || "—"}
              />
              <Spec label="网络带宽" value={product.network} />
              <Spec
                label={splitOptions.length && typeof product.maxFreePerNode === "number" ? "单机最多可租" : "可售库存"}
                value={`${maxQuantity} ${product.unitLabel}`}
              />
              <Spec label="供给方" value={product.supplierName || "—"} />
              <Spec
                label="供给方信用"
                value={product.credit
                  ? `履约率 ${product.credit.fulfillmentRate}% · 历史订单 ${product.credit.totalOrders}`
                  : "暂无历史履约数据"}
              />
            </dl>
            <ProductHealth health={product.health} />
            {product.selfOperated || managed ? (
              <div className="flex flex-wrap gap-2">
                {product.selfOperated ? <Chip color="accent" variant="soft">平台自营</Chip> : null}
                {managed ? <Chip color="accent" variant="soft">平台托管</Chip> : null}
              </div>
            ) : null}
            {managed ? (
              <section aria-labelledby="managed-terms-title" className="rounded-xl border border-border px-4 py-3 text-sm">
                <h2 className="font-medium text-foreground" id="managed-terms-title">托管租用须知</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  <li>付款后平台自动开通，开通完成后经平台 SSH 网关登录使用；开通所用时间不计入租期。</li>
                  <li>开通失败时订单自动取消并全额退款。</li>
                  <li>租期结束后自动结算，无需确认签收。</li>
                  {nightly && product.nightWindow ? (
                    <li>
                      包夜每晚可用时段为 {formatNightWindow(product.nightWindow.startMin, product.nightWindow.endMin)}；
                      当晚时段开始后 2 小时内仍可预订当晚，按整晚计费，已过去的时段不补偿。
                    </li>
                  ) : null}
                </ul>
              </section>
            ) : null}
          </Card.Content>
        </Card>

        <Card variant="secondary">
          <Card.Header>
            <Card.Title>费用试算</Card.Title>
            <Card.Description>单价 {priceLabel}</Card.Description>
          </Card.Header>
          <Card.Content className="space-y-5">
            {prices.length > 1 ? (
              <OptionChips
                items={prices.map((price) => ({
                  value: price.pricingMode,
                  label: rentalPricingModeLabels[price.pricingMode],
                  description: `${money.format(price.unitPriceMinor / 100)} / 卡·${rentalPeriodUnits[price.pricingMode]}`,
                }))}
                label="计费方式"
                onChange={(mode) => {
                  setPricingModeChoice(mode);
                  setDuration(null);
                  setNightStartChoice(null);
                }}
                value={selectedPrice?.pricingMode ?? null}
              />
            ) : null}
            {splitOptions.length ? (
              <OptionChips
                items={splitOptions.map((option) => ({
                  value: option,
                  label: `${option} 卡`,
                  disabled: option > maxQuantity,
                }))}
                label="卡数（同一台节点内）"
                onChange={setQuantity}
                value={effectiveQuantity}
              />
            ) : (
              <Stepper
                label={`购买数量(${product.unitLabel})`}
                max={maxQuantity}
                min={minOrder}
                value={effectiveQuantity}
                onChange={setQuantity}
              />
            )}
            {nightly ? (
              <NightStartPicker
                calendarQuery={calendarQuery}
                cards={effectiveQuantity}
                onChange={setNightStartChoice}
                today={today}
                value={nightStartDate ?? ""}
              />
            ) : null}
            {isPerpetual ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">计费周期</span>
                <span className="font-medium text-foreground">买断(一次性)</span>
              </div>
            ) : (
              <Stepper
                label={`${nightly ? "连续晚数" : "计费周期数"}(${durationUnitLabel})`}
                max={maxDuration}
                min={minDuration}
                value={effectiveDuration}
                onChange={setDuration}
              />
            )}

            {managed && selectedPrice ? (
              <AvailabilityStatus
                awaitingNight={awaitingNight}
                availability={availability}
                query={availabilityQuery}
              />
            ) : null}

            <dl className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">小计</dt>
                <dd className="font-medium text-foreground">
                  {totalMinor !== undefined ? money.format(totalMinor / 100) : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">其中平台服务费({feeRate !== undefined ? `${feeRate / 100}%` : "—"}, 内含)</dt>
                <dd className="text-muted">
                  {feeMinor !== undefined ? money.format(feeMinor / 100) : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <dt className="text-sm text-muted">应付合计</dt>
                <dd className="text-2xl font-semibold text-foreground">
                  {totalMinor !== undefined ? money.format(totalMinor / 100) : "—"}
                </dd>
              </div>
            </dl>

            {policyQuery.isError ? (
              <div role="alert" className="text-sm text-danger">
                交易配置暂不可用，请重试。
                <Button size="sm" variant="ghost" onPress={() => void policyQuery.refetch()}>重试</Button>
              </div>
            ) : policyQuery.isPending ? <p role="status" className="text-sm text-muted">正在读取交易配置…</p>
              : !policy?.trading_enabled ? <p role="status" className="text-sm text-warning">平台暂时停止创建交易，请稍后再试。</p>
              : product.health === "offline" ? <p role="status" className="text-sm text-muted">该商品节点已离线，暂不可下单。</p>
              : totalMinor === undefined ? <p role="alert" className="text-sm text-danger">请检查购买数量和计费周期，订单金额不能超过上限。</p> : null}

            <label className="flex items-start gap-2.5 text-[13px] leading-5 text-foreground">
              <input
                checked={agreed}
                className="mt-0.5 size-4 accent-[#173447]"
                onChange={(event) => setAgreed(event.target.checked)}
                type="checkbox"
              />
              <span>
                我已阅读并同意<LegalLink document="resource-usage-rules" />， 承诺资源不用于虚拟货币挖矿等违规用途,
                并知悉订单需在 15 分钟内完成支付。
              </span>
            </label>

            <Button
              fullWidth
              isDisabled={submitBlocked}
              isPending={orderMutation.isPending}
              onPress={() => orderMutation.mutate()}
              variant="primary"
            >
              {orderMutation.isPending ? (
                <>
                  <Spinner aria-hidden="true" color="current" size="sm" />
                  正在提交
                </>
              ) : maxQuantity < minOrder || unavailable ? (
                "库存不足"
              ) : awaitingNight ? (
                "请选择开始日期"
              ) : (
                "提交订单"
              )}
            </Button>
            <p className="text-center text-xs text-muted">
              {maxQuantity < minOrder
                ? `当前库存 ${maxQuantity} ${product.unitLabel}, 不足最小起订量 ${minOrder}`
                : `最小起订 ${minOrder} ${product.unitLabel} · 最短 ${minDuration} ${durationUnitLabel}${
                  maxDuration ? ` · 最长 ${maxDuration} ${durationUnitLabel}` : ""}`}
            </p>
          </Card.Content>
        </Card>
      </div>

      <p className="mt-6 text-sm text-muted">
        <Link className="text-accent hover:underline" href={`/market/${product.id}`}>
          ← 返回商品详情
        </Link>
      </p>
    </main>
  );
}

function AvailabilityStatus({
  availability,
  awaitingNight,
  query,
}: {
  availability: Awaited<ReturnType<typeof fetchProductAvailability>> | undefined;
  awaitingNight: boolean;
  query: {error: unknown; isError: boolean; isFetching: boolean; isPending: boolean; refetch: () => unknown};
}) {
  if (awaitingNight) return null;
  return (
    <div aria-live="polite" className="text-sm">
      <SectionQueryState
        error={query.error}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在查询余量与报价"
        notOpenText="实时余量查询暂未开放，下单时以平台校验结果为准。"
        onRetry={() => void query.refetch()}
      >
        {availability?.available ? (
          <p className="text-success" role="status">
            当前可租
            {availability.lease_preview?.start_at
              ? `，预计 ${formatDateTime(availability.lease_preview.start_at)} 起${
                availability.lease_preview.end_at ? `至 ${formatDateTime(availability.lease_preview.end_at)}` : ""}`
              : ""}
          </p>
        ) : availability ? (
          <p className="text-danger" role="alert">
            所选配置当前不可租{availability.reason ? `（${availability.reason}）` : ""}，请调整卡数、日期或租期。
          </p>
        ) : null}
      </SectionQueryState>
    </div>
  );
}

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Shanghai",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}

const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {timeZone: "UTC", weekday: "short"});

function NightStartPicker({
  calendarQuery,
  cards,
  onChange,
  today,
  value,
}: {
  calendarQuery: {
    data: Awaited<ReturnType<typeof fetchNightCalendar>> | undefined;
    error: unknown;
    isError: boolean;
    isFetching: boolean;
    isPending: boolean;
    refetch: () => unknown;
  };
  cards: number;
  onChange: (value: string) => void;
  today: string;
  value: string;
}) {
  const days = calendarQuery.data ?? [];
  const lastDay = addDays(today, NIGHT_BOOKING_HORIZON_DAYS - 1);
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-muted" htmlFor="night-start-date">首晚日期</label>
      <SectionQueryState
        emptyText={`${today} 至 ${lastDay} 暂无可预订的夜晚。`}
        error={calendarQuery.error}
        isEmpty={days.length === 0}
        isError={calendarQuery.isError}
        isPending={calendarQuery.isPending}
        isRefetching={calendarQuery.isFetching}
        loadingText="正在读取包夜日历"
        notOpenText="包夜日历暂未开放，暂不能预订包夜。"
        onRetry={() => void calendarQuery.refetch()}
      >
        <select
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-accent"
          id="night-start-date"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          <option value="">请选择</option>
          {days.map((day) => {
            const [year, month, date] = day.night_date.split("-").map(Number);
            const weekday = weekdayFormatter.format(new Date(Date.UTC(year!, month! - 1, date!)));
            const full = day.max_cards < cards;
            return (
              <option disabled={full} key={day.night_date} value={day.night_date}>
                {`${day.night_date.slice(5)} ${weekday}${day.night_date === today ? "（今晚）" : ""} · ${
                  full ? "余量不足" : `最多可租 ${day.max_cards} 卡`}`}
              </option>
            );
          })}
        </select>
      </SectionQueryState>
    </div>
  );
}

function Spec({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-1 break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Stepper({
  label,
  max = 999999,
  min,
  onChange,
  value,
}: {
  label: string;
  max?: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const clamp = (next: number) => Math.min(Math.max(next, min), max);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          aria-label="减少"
          className="h-9 w-9 min-w-9 px-0"
          isDisabled={value <= min}
          onPress={() => onChange(clamp(value - 1))}
          variant="outline"
        >
          −
        </Button>
        <span aria-live="polite" className="w-14 text-center text-lg font-semibold tabular-nums text-foreground">
          {value}
        </span>
        <Button
          aria-label="增加"
          className="h-9 w-9 min-w-9 px-0"
          isDisabled={value >= max}
          onPress={() => onChange(clamp(value + 1))}
          variant="outline"
        >
          +
        </Button>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="正在加载订单信息" />}>
      <CheckoutPage />
    </Suspense>
  );
}
