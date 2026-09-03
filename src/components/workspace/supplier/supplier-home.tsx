"use client";

import {Chip, Link} from "@heroui/react";
import {ItemCard} from "@heroui-pro/react/item-card";
import {ItemCardGroup} from "@heroui-pro/react/item-card-group";
import {KPI} from "@heroui-pro/react/kpi";
import {KPIGroup} from "@heroui-pro/react/kpi-group";
import {Widget} from "@heroui-pro/react/widget";
import {AnimatedNumber} from "@/components/system/animated-number";
import type {SupplierSettlementSummary} from "@/lib/supplier-workspace";

export type SupplierHomeMetrics = {
  activeProducts: number;
  totalStock: number;
  fulfillingOrders: number;
};

// 供给方工作台首页: 真实 KPI(在售/库存/履约中/待结算) + 资质状态 + 快捷入口。
export function SupplierHome({
  metrics,
  settlement,
}: {
  metrics: SupplierHomeMetrics;
  settlement: SupplierSettlementSummary;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem] md:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-muted">供给方账户</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">供给方工作台</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            查看商品供应、订单履约与结算进度。
          </p>
        </div>
        <Widget>
          <Widget.Header>
            <Widget.Title>供给方准入</Widget.Title>
            <Widget.Description>入驻审核状态</Widget.Description>
          </Widget.Header>
          <Widget.Content className="space-y-3">
            <Chip color="success" variant="soft">已通过</Chip>
            <p className="text-sm leading-6 text-muted">
              入驻审核已通过，可发布和管理算力商品。
            </p>
          </Widget.Content>
        </Widget>
      </header>

      <KPIGroup className="!flex-col md:!flex-row">
        <KPI>
          <KPI.Header><KPI.Title>在售商品</KPI.Title></KPI.Header>
          <KPI.Content>
            <KPI.Value value={metrics.activeProducts}>
              {() => <AnimatedNumber value={metrics.activeProducts} />}
            </KPI.Value>
          </KPI.Content>
        </KPI>
        <KPI>
          <KPI.Header><KPI.Title>可售库存</KPI.Title></KPI.Header>
          <KPI.Content>
            <KPI.Value value={metrics.totalStock}>
              {() => <AnimatedNumber value={metrics.totalStock} />}
            </KPI.Value>
          </KPI.Content>
        </KPI>
        <KPI>
          <KPI.Header><KPI.Title>履约中订单</KPI.Title></KPI.Header>
          <KPI.Content>
            <KPI.Value value={metrics.fulfillingOrders}>
              {() => <AnimatedNumber value={metrics.fulfillingOrders} />}
            </KPI.Value>
          </KPI.Content>
        </KPI>
        <KPI>
          <KPI.Header><KPI.Title>待结算</KPI.Title></KPI.Header>
          <KPI.Content>
            <KPI.Value value={settlement.pending_fen}>
              {() => (
                <AnimatedNumber
                  format={{currency: "CNY", minimumFractionDigits: 2, style: "currency"}}
                  value={settlement.pending_fen / 100}
                />
              )}
            </KPI.Value>
          </KPI.Content>
        </KPI>
      </KPIGroup>

      <ItemCardGroup>
        <ItemCardGroup.Header>
          <ItemCardGroup.Title>快捷入口</ItemCardGroup.Title>
        </ItemCardGroup.Header>
        <ItemCard>
          <ItemCard.Content>
            <ItemCard.Title>发布算力商品</ItemCard.Title>
            <ItemCard.Description>零租按卡 / 零售买断 / 算力中心 / 空心机房</ItemCard.Description>
          </ItemCard.Content>
          <ItemCard.Action>
            <Link href="/console/supplier/products/new">打开发布页</Link>
          </ItemCard.Action>
        </ItemCard>
        <ItemCard>
          <ItemCard.Content>
            <ItemCard.Title>履约订单</ItemCard.Title>
            <ItemCard.Description>接单并回填交付凭证</ItemCard.Description>
          </ItemCard.Content>
          <ItemCard.Action>
            <Link href="/console/supplier/orders">处理订单</Link>
          </ItemCard.Action>
        </ItemCard>
        <ItemCard>
          <ItemCard.Content>
            <ItemCard.Title>结算中心</ItemCard.Title>
            <ItemCard.Description>应结 / 已分账 / 待结流水</ItemCard.Description>
          </ItemCard.Content>
          <ItemCard.Action>
            <Link href="/console/supplier/settlements">查看结算</Link>
          </ItemCard.Action>
        </ItemCard>
        <ItemCard>
          <ItemCard.Content>
            <ItemCard.Title>资质材料</ItemCard.Title>
            <ItemCard.Description>补充与维护机房证明材料</ItemCard.Description>
          </ItemCard.Content>
          <ItemCard.Action>
            <Link href="/console/supplier/qualifications">管理资质</Link>
          </ItemCard.Action>
        </ItemCard>
      </ItemCardGroup>
    </section>
  );
}
