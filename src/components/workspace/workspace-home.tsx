"use client";

import {Button, Card, Chip, Link} from "@heroui/react";
import {EmptyState} from "@heroui-pro/react/empty-state";
import {ItemCard} from "@heroui-pro/react/item-card";
import {ItemCardGroup} from "@heroui-pro/react/item-card-group";
import {KPI} from "@heroui-pro/react/kpi";
import {KPIGroup} from "@heroui-pro/react/kpi-group";
import {Widget} from "@heroui-pro/react/widget";
import {useRouter} from "next/navigation";

import {
  useCurrentAccount,
  useIdentityApplications,
} from "@/lib/auth/queries";
import type {Role, VerificationStatus} from "@/lib/domain/contracts";

export type WorkspaceRole = Exclude<Role, "guest">;

type WorkspaceHomeProps = {
  role: WorkspaceRole;
};

type WorkspaceConfig = {
  accountLabel: string;
  title: string;
  description: string;
  metrics: readonly {label: string; value: number; currency?: boolean}[];
  emptyTitle: string;
  emptyDescription: string;
  links: readonly {href: "/market" | "/auth/identity"; label: string}[];
};

const workspaceConfig: Record<WorkspaceRole, WorkspaceConfig> = {
  buyer: {
    accountLabel: "采购账户",
    title: "买家工作台",
    description: "跟踪算力采购、交付验收与账务进度。",
    metrics: [
      {label: "进行中订单", value: 0},
      {label: "待验收", value: 0},
      {currency: true, label: "本月支出", value: 0},
    ],
    emptyTitle: "当前没有待处理订单",
    emptyDescription: "选定算力后，可在这里跟踪支付、交付与验收。",
    links: [
      {href: "/market", label: "选购算力"},
      {href: "/auth/identity", label: "申请业务身份"},
    ],
  },
  supplier: {
    accountLabel: "供给方账户",
    title: "供给方工作台",
    description: "查看商品供应、订单履约与结算进度。",
    metrics: [
      {label: "在售商品", value: 0},
      {label: "履约中订单", value: 0},
      {currency: true, label: "待结算", value: 0},
    ],
    emptyTitle: "当前没有待履约订单",
    emptyDescription: "新订单确认后，可在这里查看交付与验收进度。",
    links: [
      {href: "/market", label: "查看市场供需"},
      {href: "/auth/identity", label: "管理业务身份"},
    ],
  },
  vendor: {
    accountLabel: "设备厂商账户",
    title: "厂商工作台",
    description: "跟进设备与机电服务线索、报价和佣金。",
    metrics: [
      {label: "新线索", value: 0},
      {label: "跟进中", value: 0},
      {currency: true, label: "待结佣", value: 0},
    ],
    emptyTitle: "当前没有分配中的线索",
    emptyDescription: "平台分配线索后，可在这里记录跟进与报价结果。",
    links: [
      {href: "/market", label: "查看算力市场"},
      {href: "/auth/identity", label: "管理业务身份"},
    ],
  },
  funder: {
    accountLabel: "资方账户",
    title: "资方工作台",
    description: "处理融资租赁线索、方案报价与跟进记录。",
    metrics: [
      {label: "新线索", value: 0},
      {label: "跟进中", value: 0},
      {label: "待报价", value: 0},
    ],
    emptyTitle: "当前没有分配中的融资线索",
    emptyDescription: "平台分配线索后，可在这里推进尽调与方案报价。",
    links: [
      {href: "/market", label: "查看算力市场"},
      {href: "/auth/identity", label: "管理业务身份"},
    ],
  },
  operator: {
    accountLabel: "运营账户",
    title: "运营工作台",
    description: "处理平台审核、交易异常与风险事项。",
    metrics: [
      {label: "待审核", value: 0},
      {label: "异常订单", value: 0},
      {label: "风险事项", value: 0},
    ],
    emptyTitle: "当前没有待处理事项",
    emptyDescription: "新的审核、交易异常和风险事项会集中显示在这里。",
    links: [{href: "/market", label: "查看公开市场"}],
  },
  admin: {
    accountLabel: "管理员账户",
    title: "管理工作台",
    description: "掌握平台审核、风险事项与系统运行状态。",
    metrics: [
      {label: "待审核", value: 0},
      {label: "风险事项", value: 0},
      {label: "系统异常", value: 0},
    ],
    emptyTitle: "当前没有待处理事项",
    emptyDescription: "新的审核、风险和系统异常会集中显示在这里。",
    links: [{href: "/market", label: "查看公开市场"}],
  },
};

const verificationCopy: Record<
  VerificationStatus,
  {label: string; detail: string; color: "danger" | "success" | "warning" | "default"}
> = {
  unverified: {
    color: "warning",
    label: "未认证",
    detail: "完成实名认证后可使用完整交易功能。",
  },
  pending: {color: "warning", label: "审核中", detail: "认证资料已提交，正在等待审核。"},
  verified: {color: "success", label: "已认证", detail: "账户认证状态正常。"},
  rejected: {color: "danger", label: "未通过", detail: "请检查认证资料并重新提交。"},
};

const identityRoleLabels = {
  supplier: "供给方",
  vendor: "设备厂商",
  funder: "资方",
} as const;

export function WorkspaceHome({role}: WorkspaceHomeProps) {
  const router = useRouter();
  const config = workspaceConfig[role];
  const accountQuery = useCurrentAccount();
  const applicationsQuery = useIdentityApplications();
  const account = accountQuery.data;
  const verification = account
    ? verificationCopy[account.verificationStatus]
    : null;
  const pendingApplications = applicationsQuery.data ?? [];
  const needsVerification =
    account?.verificationStatus === "unverified" ||
    account?.verificationStatus === "rejected";
  const todoCount = pendingApplications.length + (needsVerification ? 1 : 0);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="grid gap-6 md:grid-cols-[minmax(0,1fr)_22rem] md:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-muted">{config.accountLabel}</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {config.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            {config.description}
          </p>
        </div>

        <Card variant="secondary">
          <Card.Header>
            <Card.Title>当前账户</Card.Title>
            <Card.Description>
              {account?.displayName ??
                (accountQuery.isPending ? "正在读取账户" : "账户状态不可用")}
            </Card.Description>
          </Card.Header>
          {accountQuery.isError ? (
            <Card.Footer>
              <Button onPress={() => void accountQuery.refetch()} variant="outline">
                重新读取
              </Button>
            </Card.Footer>
          ) : null}
        </Card>
      </header>

      <KPIGroup className="!flex-col md:!flex-row">
        {config.metrics.map((metric) => (
          <KPI key={metric.label}>
            <KPI.Header>
              <KPI.Title>{metric.label}</KPI.Title>
            </KPI.Header>
            <KPI.Content>
              <KPI.Value
                currency={metric.currency ? "CNY" : undefined}
                locale="zh-CN"
                minimumFractionDigits={metric.currency ? 2 : 0}
                style={metric.currency ? "currency" : "decimal"}
                value={metric.value}
              />
            </KPI.Content>
          </KPI>
        ))}
      </KPIGroup>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Widget>
          <Widget.Header>
            <div>
              <Widget.Title>待处理事项</Widget.Title>
              <Widget.Description>{todoCount} 项</Widget.Description>
            </div>
          </Widget.Header>
          <Widget.Content>
            {needsVerification ? (
              <ItemCard>
                <ItemCard.Content>
                  <ItemCard.Title>完成实名认证</ItemCard.Title>
                  <ItemCard.Description>{verification?.detail}</ItemCard.Description>
                </ItemCard.Content>
                <ItemCard.Action>
                  <Button onPress={() => router.push("/auth/verify")}>前往认证</Button>
                </ItemCard.Action>
              </ItemCard>
            ) : pendingApplications.length > 0 ? (
              <ItemCardGroup>
                {pendingApplications.map((application) => (
                  <ItemCard key={application.id}>
                    <ItemCard.Content>
                      <ItemCard.Title>
                        {identityRoleLabels[application.requestedRole]}身份申请
                      </ItemCard.Title>
                      <ItemCard.Description>资料已提交，正在等待审核。</ItemCard.Description>
                    </ItemCard.Content>
                    <ItemCard.Action>
                      <Chip color="warning" variant="soft">审核中</Chip>
                    </ItemCard.Action>
                  </ItemCard>
                ))}
              </ItemCardGroup>
            ) : (
              <EmptyState>
                <EmptyState.Header>
                  <EmptyState.Title>{config.emptyTitle}</EmptyState.Title>
                  <EmptyState.Description>{config.emptyDescription}</EmptyState.Description>
                </EmptyState.Header>
              </EmptyState>
            )}
          </Widget.Content>
        </Widget>

        <div className="space-y-6">
          <Widget>
            <Widget.Header>
              <Widget.Title>账户认证</Widget.Title>
            </Widget.Header>
            <Widget.Content className="space-y-3">
              <Chip color={verification?.color ?? "default"} variant="soft">
                {verification?.label ?? (accountQuery.isPending ? "读取中" : "不可用")}
              </Chip>
              <p className="text-sm leading-6 text-muted">
                {verification?.detail ?? "暂时无法读取账户认证状态。"}
              </p>
            </Widget.Content>
          </Widget>

          <ItemCardGroup>
            <ItemCardGroup.Header>
              <ItemCardGroup.Title>快捷入口</ItemCardGroup.Title>
            </ItemCardGroup.Header>
            {config.links.map((item) => (
              <ItemCard key={item.href}>
                <ItemCard.Content>
                  <ItemCard.Title>{item.label}</ItemCard.Title>
                </ItemCard.Content>
                <ItemCard.Action>
                  <Link href={item.href}>打开</Link>
                </ItemCard.Action>
              </ItemCard>
            ))}
          </ItemCardGroup>
        </div>
      </div>
    </section>
  );
}
