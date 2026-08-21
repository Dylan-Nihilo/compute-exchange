"use client";

import {EmptyState} from "@heroui-pro/react/empty-state";
import {ItemCard} from "@heroui-pro/react/item-card";
import {ItemCardGroup} from "@heroui-pro/react/item-card-group";
import {KPI} from "@heroui-pro/react/kpi";
import {KPIGroup} from "@heroui-pro/react/kpi-group";
import {Widget} from "@heroui-pro/react/widget";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  InputGroup,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import NextLink from "next/link";

import {OmnisLoader} from "@/components/system/omnis-loader";

const sections = [
  {href: "#loading", index: "01", label: "Loading"},
  {href: "#actions", index: "02", label: "按钮与标签"},
  {href: "#feedback", index: "03", label: "状态反馈"},
  {href: "#forms", index: "04", label: "表单控件"},
  {href: "#data", index: "05", label: "数据容器"},
  {href: "#empty", index: "06", label: "空状态"},
] as const;

export default function ComponentsPage() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:py-14">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <Chip color="accent" size="sm" variant="soft">LOCAL ONLY</Chip>
              <span className="text-sm text-muted">OmniS Design System</span>
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Component Lab
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              公共组件的实时样式与状态。这里直接使用产品组件，代码更新后页面会同步刷新。
            </p>
          </div>
          <NextLink
            className="w-fit text-sm font-medium text-muted underline decoration-border-secondary underline-offset-8 transition-colors hover:text-foreground"
            href="/"
          >
            返回产品首页
          </NextLink>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:px-10 lg:py-16">
        <aside className="hidden lg:block">
          <nav aria-label="组件索引" className="sticky top-8 border-l border-border pl-5">
            <p className="mb-4 text-xs font-semibold tracking-[0.12em] text-muted">INDEX</p>
            <ol className="space-y-3">
              {sections.map((section) => (
                <li key={section.href}>
                  <a
                    className="group flex items-baseline gap-3 text-sm text-muted transition-colors hover:text-foreground"
                    href={section.href}
                  >
                    <span className="text-xs tabular-nums opacity-60">{section.index}</span>
                    <span>{section.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 space-y-20">
          <ShowcaseSection
            description="品牌字标描边动效，分别用于页面切换与局部数据等待。"
            id="loading"
            index="01"
            title="Loading"
          >
            <div className="grid overflow-hidden rounded-3xl border border-border bg-surface sm:grid-cols-2">
              <Specimen label="Route · md">
                <div className="grid min-h-64 place-items-center">
                  <OmnisLoader label="正在加载算力市场" />
                </div>
              </Specimen>
              <Specimen className="border-t sm:border-l sm:border-t-0" label="State · sm">
                <div className="grid min-h-64 place-items-center">
                  <OmnisLoader label="正在验证访问权限" size="sm" />
                </div>
              </Specimen>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            description="操作层级和业务状态必须明确，不以颜色替代文字。"
            id="actions"
            index="02"
            title="按钮与标签"
          >
            <div className="space-y-8 border-y border-border py-8">
              <div>
                <SpecimenLabel>Button variants</SpecimenLabel>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button variant="primary">确认下单</Button>
                  <Button variant="outline">保存草稿</Button>
                  <Button variant="ghost">查看详情</Button>
                  <Button variant="danger-soft">取消订单</Button>
                  <Button isDisabled variant="primary">不可操作</Button>
                  <Button isPending variant="primary">
                    <Spinner aria-hidden="true" color="current" size="sm" />
                    正在提交
                  </Button>
                </div>
              </div>
              <div>
                <SpecimenLabel>Business status</SpecimenLabel>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Chip variant="soft">待提交</Chip>
                  <Chip color="accent" variant="soft">处理中</Chip>
                  <Chip color="success" variant="soft">已完成</Chip>
                  <Chip color="warning" variant="soft">待审核</Chip>
                  <Chip color="danger" variant="soft">已驳回</Chip>
                </div>
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            description="反馈组件用于说明结果、风险和下一步动作。"
            id="feedback"
            index="03"
            title="状态反馈"
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <Alert status="success">
                <Alert.Content>
                  <Alert.Title>认证已通过</Alert.Title>
                  <Alert.Description>账户已解锁完整交易能力。</Alert.Description>
                </Alert.Content>
              </Alert>
              <Alert status="warning">
                <Alert.Content>
                  <Alert.Title>等待资料审核</Alert.Title>
                  <Alert.Description>预计一个工作日内完成处理。</Alert.Description>
                </Alert.Content>
              </Alert>
              <Alert status="danger">
                <Alert.Content>
                  <Alert.Title>操作未完成</Alert.Title>
                  <Alert.Description>请核对信息后重新提交。</Alert.Description>
                </Alert.Content>
              </Alert>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            description="表单示例沿用业务页面的 secondary 输入样式和中文校验语气。"
            id="forms"
            index="04"
            title="表单控件"
          >
            <div className="grid gap-6 rounded-3xl border border-border bg-surface p-6 sm:p-8 lg:grid-cols-2">
              <TextField defaultValue="H100 SXM 80GB" variant="secondary">
                <Label>资源名称</Label>
                <InputGroup variant="secondary">
                  <InputGroup.Input placeholder="请输入资源名称" />
                </InputGroup>
              </TextField>
              <TextField variant="secondary">
                <Label>联系人手机号</Label>
                <InputGroup variant="secondary">
                  <InputGroup.Input inputMode="tel" placeholder="请输入手机号" />
                </InputGroup>
              </TextField>
              <div className="lg:col-span-2">
                <Checkbox defaultSelected variant="secondary">
                  我已确认资源用途符合平台合规要求
                </Checkbox>
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            description="高密度业务信息优先使用 KPI、Widget 与 Card 建立层级。"
            id="data"
            index="05"
            title="数据容器"
          >
            <div className="space-y-6">
              <KPIGroup className="!flex-col md:!flex-row">
                <KPI>
                  <KPI.Header><KPI.Title>可用供给</KPI.Title></KPI.Header>
                  <KPI.Content><KPI.Value value={128} /></KPI.Content>
                </KPI>
                <KPI>
                  <KPI.Header><KPI.Title>履约中订单</KPI.Title></KPI.Header>
                  <KPI.Content><KPI.Value value={12} /></KPI.Content>
                </KPI>
                <KPI>
                  <KPI.Header><KPI.Title>本月支出</KPI.Title></KPI.Header>
                  <KPI.Content>
                    <KPI.Value currency="CNY" locale="zh-CN" value={286400} />
                  </KPI.Content>
                </KPI>
              </KPIGroup>

              <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <Widget>
                  <Widget.Header>
                    <div>
                      <Widget.Title>待处理事项</Widget.Title>
                      <Widget.Description>2 项</Widget.Description>
                    </div>
                    <Chip color="warning" variant="soft">需要处理</Chip>
                  </Widget.Header>
                  <Widget.Content>
                    <ItemCardGroup>
                      <ItemCard>
                        <ItemCard.Content>
                          <ItemCard.Title>确认 H100 集群交付</ItemCard.Title>
                          <ItemCard.Description>订单 OM-20260821-001 · 待验收</ItemCard.Description>
                        </ItemCard.Content>
                        <ItemCard.Action>
                          <Button size="sm" variant="outline">查看订单</Button>
                        </ItemCard.Action>
                      </ItemCard>
                      <ItemCard>
                        <ItemCard.Content>
                          <ItemCard.Title>补充企业认证资料</ItemCard.Title>
                          <ItemCard.Description>营业执照有效期需要更新</ItemCard.Description>
                        </ItemCard.Content>
                        <ItemCard.Action>
                          <Button size="sm" variant="ghost">去处理</Button>
                        </ItemCard.Action>
                      </ItemCard>
                    </ItemCardGroup>
                  </Widget.Content>
                </Widget>

                <Card variant="secondary">
                  <Card.Header>
                    <Card.Title>资源规格</Card.Title>
                    <Card.Description>订单确认前的关键配置</Card.Description>
                  </Card.Header>
                  <Card.Content>
                    <dl className="space-y-4 text-sm">
                      <DataRow label="GPU" value="H100 80GB" />
                      <DataRow label="区域" value="内蒙古 · 乌兰察布" />
                      <DataRow label="计费" value="¥18.60 / GPU·小时" />
                    </dl>
                  </Card.Content>
                </Card>
              </div>
            </div>
          </ShowcaseSection>

          <ShowcaseSection
            description="没有数据时说明现状，并给出用户可以继续执行的动作。"
            id="empty"
            index="06"
            title="空状态"
          >
            <div className="rounded-3xl border border-border bg-surface px-6 py-12">
              <EmptyState className="mx-auto max-w-md">
                <EmptyState.Header>
                  <EmptyState.Title>当前没有待处理订单</EmptyState.Title>
                  <EmptyState.Description>
                    选定算力后，可在这里跟踪支付、交付与验收进度。
                  </EmptyState.Description>
                </EmptyState.Header>
                <EmptyState.Content>
                  <Button variant="primary">浏览算力市场</Button>
                </EmptyState.Content>
              </EmptyState>
            </div>
          </ShowcaseSection>
        </div>
      </div>
    </main>
  );
}

function ShowcaseSection({
  children,
  description,
  id,
  index,
  title,
}: {
  children: React.ReactNode;
  description: string;
  id: string;
  index: string;
  title: string;
}) {
  return (
    <section className="scroll-mt-8" id={id}>
      <header className="mb-8 grid gap-3 sm:grid-cols-[3rem_minmax(0,1fr)]">
        <span className="pt-1 text-xs font-medium tabular-nums text-muted">{index}</span>
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Specimen({
  children,
  className = "",
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={["relative border-border", className].join(" ")}>
      <span className="absolute left-5 top-5 text-xs font-medium tracking-[0.08em] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function SpecimenLabel({children}: {children: React.ReactNode}) {
  return (
    <p className="text-xs font-semibold tracking-[0.1em] text-muted">{children}</p>
  );
}

function DataRow({label, value}: {label: string; value: string}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}
