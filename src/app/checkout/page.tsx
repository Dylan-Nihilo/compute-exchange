"use client";

import {useMutation, useQuery} from "@tanstack/react-query";
import {Button, Card, Chip, Skeleton, Spinner} from "@heroui/react";
import Link from "next/link";
import {useRouter, useSearchParams} from "next/navigation";
import {Suspense, useMemo, useState} from "react";

import {ErrorState, LoadingState} from "@/components/system/operation-state";
import {useCurrentAccount} from "@/lib/auth/queries";
import {useAuthStore} from "@/lib/auth/store";
import {
  calcOrderPreview,
  getMarketProduct,
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

  const [quantity, setQuantity] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);

  const minOrder = product?.minimumOrder ?? 1;
  const minDuration = product?.minimumDuration ?? 1;
  const maxQuantity = product?.availableUnits ?? 1;
  const isPerpetual = product?.pricingMode === "perpetual";
  const effectiveQuantity = quantity ?? minOrder;
  const effectiveDuration = isPerpetual ? 1 : (duration ?? minDuration);

  const preview = useMemo(() => {
    if (!product?.unitPriceMinor) return null;
    return calcOrderPreview(product.unitPriceMinor, effectiveQuantity, effectiveDuration);
  }, [product, effectiveQuantity, effectiveDuration]);

  const orderMutation = useMutation({
    mutationFn: () =>
      placeOrder({
        product_id: Number(product!.id),
        quantity: effectiveQuantity,
        duration: effectiveDuration,
        compliance_agreed: agreed,
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

  if (!product.unitPriceMinor) {
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

  const durationUnitLabel = product.durationUnit;

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
              <Spec label="可售时段" value={product.availableHours || "—"} />
              <Spec label="网络带宽" value={product.network} />
              <Spec label="可售库存" value={`${product.availableUnits} ${product.unitLabel}`} />
              <Spec
                label="供给方信用"
                value={product.credit
                  ? `履约率 ${product.credit.fulfillmentRate}% · 历史订单 ${product.credit.totalOrders}`
                  : "暂无历史履约数据"}
              />
            </dl>
            {product.selfOperated ? (
              <Chip color="accent" variant="soft">平台自营</Chip>
            ) : null}
          </Card.Content>
        </Card>

        <Card variant="secondary">
          <Card.Header>
            <Card.Title>费用试算</Card.Title>
            <Card.Description>
              单价 {product.unitPrice} / {product.priceUnit}
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-5">
            <Stepper
              label={`购买数量(${product.unitLabel})`}
              max={maxQuantity}
              min={minOrder}
              value={effectiveQuantity}
              onChange={setQuantity}
            />
            {isPerpetual ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">计费周期</span>
                <span className="font-medium text-foreground">买断(一次性)</span>
              </div>
            ) : (
              <Stepper
                label={`计费周期数(${durationUnitLabel})`}
                min={minDuration}
                value={effectiveDuration}
                onChange={setDuration}
              />
            )}

            <dl className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">小计</dt>
                <dd className="font-medium text-foreground">
                  {preview ? money.format(preview.totalMinor / 100) : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">其中平台服务费(5%, 内含)</dt>
                <dd className="text-muted">
                  {preview ? money.format(preview.feeMinor / 100) : "—"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <dt className="text-sm text-muted">应付合计</dt>
                <dd className="text-2xl font-semibold text-foreground">
                  {preview ? money.format(preview.totalMinor / 100) : "—"}
                </dd>
              </div>
            </dl>

            <label className="flex items-start gap-2.5 text-[13px] leading-5 text-foreground">
              <input
                checked={agreed}
                className="mt-0.5 size-4 accent-[#173447]"
                onChange={(event) => setAgreed(event.target.checked)}
                type="checkbox"
              />
              <span>
                我已阅读并同意《算力资源使用规范》, 承诺资源不用于虚拟货币挖矿等违规用途,
                并知悉订单需在 15 分钟内完成支付。
              </span>
            </label>

            <Button
              fullWidth
              isDisabled={!agreed || maxQuantity < minOrder}
              isPending={orderMutation.isPending}
              onPress={() => orderMutation.mutate()}
              variant="primary"
            >
              {orderMutation.isPending ? (
                <>
                  <Spinner aria-hidden="true" color="current" size="sm" />
                  正在提交
                </>
              ) : maxQuantity < minOrder ? (
                "库存不足"
              ) : (
                "提交订单"
              )}
            </Button>
            <p className="text-center text-xs text-muted">
              {maxQuantity < minOrder
                ? `当前库存 ${maxQuantity} ${product.unitLabel}, 不足最小起订量 ${minOrder}`
                : `最小起订 ${minOrder} ${product.unitLabel} · 最短 ${minDuration} ${durationUnitLabel}`}
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
