"use client";

import {Breadcrumbs, Button, Card, Chip} from "@heroui/react";
import {KPI} from "@heroui-pro/react/kpi";
import {KPIGroup} from "@heroui-pro/react/kpi-group";

import {useRouter} from "next/navigation";

import {AnimatedNumber} from "@/components/system/animated-number";
import type {MarketProductDetail} from "@/lib/market-api";

const rateFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: "percent",
});

export function MarketProductDetailView({
  product,
}: {
  product: MarketProductDetail;
}) {
  const router = useRouter();
  const specifications = [
    {label: "GPU 型号", value: product.gpuModel || "—"},
    {label: "CPU", value: product.cpuSpec || "—"},
    {label: "显存 / 内存", value: product.memorySpec || "—"},
    {label: "存储", value: product.storageSpec || "—"},
    ...(product.machineCount === null
      ? []
      : [{label: "机器数量", value: `${product.machineCount} 台`}]),
    ...(product.rackCount === null
      ? []
      : [{label: "机柜数量", value: `${product.rackCount} 个`}]),
    ...(product.totalPflopsApprox
      ? [{label: "参考总算力", value: product.totalPflopsApprox}]
      : []),
    ...(product.powerCapacityKw === null
      ? []
      : [{label: "电力容量", value: `${product.powerCapacityKw} kW`}]),
  ];
  const deliveryDetails = [
    {label: "地域", value: product.region},
    {label: "可售时段", value: product.availableHours || "—"},
    {label: "交付方式", value: product.deliveryMode},
    {label: "网络带宽", value: product.network},
    {label: "计费方式", value: product.billingMode},
    {
      label: "最短租期",
      value:
        product.billingMode === "买断"
          ? "一次性买断"
          : `${product.minimumDuration} ${product.durationUnit}`,
    },
  ];
  const hasCreditHistory = Boolean(product.credit?.totalOrders);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
      <Breadcrumbs aria-label="页面路径">
        <Breadcrumbs.Item href="/market">算力市场</Breadcrumbs.Item>
        <Breadcrumbs.Item>{product.gpuModel || "商品详情"}</Breadcrumbs.Item>
      </Breadcrumbs>

      <header className="mt-6 border-b border-border pb-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip variant="soft">{product.productTypeLabel}</Chip>
          <Chip
            color={product.status === "active" ? "success" : "default"}
            variant="soft"
          >
            {product.statusLabel}
          </Chip>
          {product.selfOperated ? (
            <Chip color="accent" variant="soft">平台自营</Chip>
          ) : null}
        </div>
        <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {product.name}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {product.region} · 商品编号 {product.id} · 供给方编号 {product.supplierId}
        </p>
      </header>

      <KPIGroup className="mt-6 !flex-col sm:!flex-row">
        <KPI>
          <KPI.Header>
            <KPI.Title>可售余量（{product.unitLabel ?? "GPU"}）</KPI.Title>
          </KPI.Header>
          <KPI.Content>
            <KPI.Value locale="zh-CN" value={product.availableUnits}>
              {() => <AnimatedNumber value={product.availableUnits} />}
            </KPI.Value>
          </KPI.Content>
        </KPI>
        <KPI>
          <KPI.Header>
            <KPI.Title>资源总量（{product.unitLabel ?? "GPU"}）</KPI.Title>
          </KPI.Header>
          <KPI.Content>
            <KPI.Value locale="zh-CN" value={product.totalUnits}>
              {() => <AnimatedNumber value={product.totalUnits} />}
            </KPI.Value>
          </KPI.Content>
        </KPI>
        <KPI>
          <KPI.Header>
            <KPI.Title>起订数量（{product.unitLabel ?? "GPU"}）</KPI.Title>
          </KPI.Header>
          <KPI.Content>
            <KPI.Value locale="zh-CN" value={product.minimumOrder}>
              {() => <AnimatedNumber value={product.minimumOrder} />}
            </KPI.Value>
          </KPI.Content>
        </KPI>
      </KPIGroup>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card variant="secondary">
            <Card.Header>
              <Card.Title>资源规格</Card.Title>
              <Card.Description>
                规格信息由供给方提供，实际交付配置以订单确认为准。
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {specifications.map((item) => (
                  <div key={item.label}>
                    <dt className="text-sm text-muted">{item.label}</dt>
                    <dd className="mt-1 break-words font-medium text-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card.Content>
          </Card>

          <Card variant="secondary">
            <Card.Header>
              <Card.Title>交付与计费</Card.Title>
              <Card.Description>
                下单前请确认可售时段、网络条件与交付方式。
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {deliveryDetails.map((item) => (
                  <div key={item.label}>
                    <dt className="text-sm text-muted">{item.label}</dt>
                    <dd className="mt-1 break-words font-medium text-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card.Content>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <Card>
            <Card.Header>
              <Card.Title>参考价格</Card.Title>
              <Card.Description>商品价格不代表最终订单金额</Card.Description>
            </Card.Header>
            <Card.Content>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {product.unitPrice}
                </span>
                {product.priceUnit ? (
                  <span className="text-sm text-muted">/ {product.priceUnit}</span>
                ) : null}
              </div>
              <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted">
                平台服务费包含在商品价格内，订单金额以确认页试算为准。
              </p>
              {product.unitPriceMinor && product.status === "active" ? (
                <Button
                  className="mt-4"
                  fullWidth
                  onPress={() => router.push(`/checkout?product=${product.id}`)}
                  variant="primary"
                >
                  立即购买
                </Button>
              ) : product.status === "active" ? (
                <Button className="mt-4" fullWidth onPress={() => router.push(`/market/${product.id}/inquiry`)}>申请报价</Button>
              ) : (
                <p className="mt-4 rounded-xl bg-default/40 px-3.5 py-2.5 text-center text-xs text-muted">
                  {product.status !== "active" ? "该商品暂不可下单" : "该商品仅支持面议, 请联系平台获取报价"}
                </p>
              )}
            </Card.Content>
          </Card>

          <Card variant="secondary">
            <Card.Header>
              <Card.Title>供给方信用</Card.Title>
              <Card.Description>供给方编号 {product.supplierId}</Card.Description>
            </Card.Header>
            <Card.Content>
              {hasCreditHistory && product.credit ? (
                <dl className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-muted">履约率</dt>
                    <dd className="font-medium tabular-nums">
                      {rateFormatter.format(product.credit.fulfillmentRate / 100)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-muted">SLA 达成率</dt>
                    <dd className="font-medium tabular-nums">
                      {rateFormatter.format(product.credit.slaRate / 100)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-muted">历史订单</dt>
                    <dd className="font-medium tabular-nums">
                      {product.credit.totalOrders}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-sm text-muted">违约记录</dt>
                    <dd className="font-medium tabular-nums">
                      {product.credit.violationCount}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm leading-6 text-muted">暂无历史履约数据。</p>
              )}
            </Card.Content>
          </Card>

          <Card variant="secondary">
            <Card.Header>
              <Card.Title>交易合规</Card.Title>
            </Card.Header>
            <Card.Content>
              <p className="text-sm leading-6 text-muted">
                下单时需确认资源用途，并遵守平台禁止虚拟货币挖矿等合规要求。
              </p>
            </Card.Content>
          </Card>
        </aside>
      </div>
    </main>
  );
}
