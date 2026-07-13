"use client";

import {Chip, Link, buttonVariants} from "@heroui/react";
import {ItemCard} from "@heroui-pro/react/item-card";
import {ItemCardGroup} from "@heroui-pro/react/item-card-group";
import {KPI} from "@heroui-pro/react/kpi";
import {KPIGroup} from "@heroui-pro/react/kpi-group";
import {Widget} from "@heroui-pro/react/widget";

const services = [
  {
    title: "算力采购",
    description: "按 GPU 型号、地域与交付方式筛选可用供给。",
  },
  {
    title: "资源供给",
    description: "完成资质审核后发布机房资源并管理履约。",
  },
  {
    title: "设备与融资协作",
    description: "连接设备服务、融资租赁与算力项目需求。",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)] lg:items-center lg:px-8">
        <div>
          <Chip variant="soft">合规算力交易基础设施</Chip>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            连接算力供给、交易与交付
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            面向采购方、机房供给方、设备厂商与资方的一体化协作平台。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className={buttonVariants({size: "lg", variant: "primary"})} href="/market">
              浏览算力市场
            </Link>
            <Link className={buttonVariants({size: "lg", variant: "outline"})} href="/auth/login">
              进入工作台
            </Link>
          </div>
        </div>

        <Widget>
          <Widget.Header>
            <div>
              <Widget.Title>当前市场</Widget.Title>
              <Widget.Description>部分在售资源</Widget.Description>
            </div>
            <Chip color="success" variant="soft">运行中</Chip>
          </Widget.Header>
          <Widget.Content>
            <ItemCardGroup>
              <ItemCard>
                <ItemCard.Content>
                  <ItemCard.Title>H100 SXM 80GB 训练集群</ItemCard.Title>
                  <ItemCard.Description>内蒙古 · 乌兰察布 · 64 GPU</ItemCard.Description>
                </ItemCard.Content>
                <ItemCard.Action>
                  <Chip variant="soft">¥18.60 / GPU·小时</Chip>
                </ItemCard.Action>
              </ItemCard>
              <ItemCard>
                <ItemCard.Content>
                  <ItemCard.Title>H20 96GB 推理集群</ItemCard.Title>
                  <ItemCard.Description>宁夏 · 中卫 · 128 GPU</ItemCard.Description>
                </ItemCard.Content>
                <ItemCard.Action>
                  <Chip variant="soft">¥9.80 / GPU·小时</Chip>
                </ItemCard.Action>
              </ItemCard>
            </ItemCardGroup>
          </Widget.Content>
        </Widget>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <KPIGroup className="!flex-col md:!flex-row">
          <KPI>
            <KPI.Header><KPI.Title>可用供给</KPI.Title></KPI.Header>
            <KPI.Content><KPI.Value value={3} /></KPI.Content>
          </KPI>
          <KPI>
            <KPI.Header><KPI.Title>覆盖区域</KPI.Title></KPI.Header>
            <KPI.Content><KPI.Value value={3} /></KPI.Content>
          </KPI>
          <KPI>
            <KPI.Header><KPI.Title>业务身份</KPI.Title></KPI.Header>
            <KPI.Content><KPI.Value value={4} /></KPI.Content>
          </KPI>
        </KPIGroup>

        <ItemCardGroup
          className="grid-cols-1 md:grid-cols-3"
          layout="grid"
        >
          <ItemCardGroup.Header>
            <ItemCardGroup.Title>平台服务</ItemCardGroup.Title>
            <ItemCardGroup.Description>
              从市场检索到履约协作，按账户身份进入对应工作台。
            </ItemCardGroup.Description>
          </ItemCardGroup.Header>
          {services.map((service) => (
            <ItemCard key={service.title}>
              <ItemCard.Content>
                <ItemCard.Title>{service.title}</ItemCard.Title>
                <ItemCard.Description>{service.description}</ItemCard.Description>
              </ItemCard.Content>
            </ItemCard>
          ))}
        </ItemCardGroup>
      </section>
    </main>
  );
}
