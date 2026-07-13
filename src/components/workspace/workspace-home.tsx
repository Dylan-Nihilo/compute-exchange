"use client";

import Link from "next/link";

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
  metrics: readonly {label: string; value: string}[];
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
      {label: "进行中订单", value: "0"},
      {label: "待验收", value: "0"},
      {label: "本月支出", value: "¥0.00"},
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
      {label: "在售商品", value: "0"},
      {label: "履约中订单", value: "0"},
      {label: "待结算", value: "¥0.00"},
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
      {label: "新线索", value: "0"},
      {label: "跟进中", value: "0"},
      {label: "待结佣", value: "¥0.00"},
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
      {label: "新线索", value: "0"},
      {label: "跟进中", value: "0"},
      {label: "待报价", value: "0"},
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
      {label: "待审核", value: "0"},
      {label: "异常订单", value: "0"},
      {label: "风险事项", value: "0"},
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
      {label: "待审核", value: "0"},
      {label: "风险事项", value: "0"},
      {label: "系统异常", value: "0"},
    ],
    emptyTitle: "当前没有待处理事项",
    emptyDescription: "新的审核、风险和系统异常会集中显示在这里。",
    links: [{href: "/market", label: "查看公开市场"}],
  },
};

const verificationCopy: Record<
  VerificationStatus,
  {label: string; detail: string}
> = {
  unverified: {label: "未认证", detail: "完成实名认证后可使用完整交易功能。"},
  pending: {label: "审核中", detail: "认证资料已提交，正在等待审核。"},
  verified: {label: "已认证", detail: "账户认证状态正常。"},
  rejected: {label: "未通过", detail: "请检查认证资料并重新提交。"},
};

const identityRoleLabels = {
  supplier: "供给方",
  vendor: "设备厂商",
  funder: "资方",
} as const;

const focusClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]";

export function WorkspaceHome({role}: WorkspaceHomeProps) {
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
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <header className="grid gap-6 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <p className="mb-3 text-sm font-medium text-muted">
            {config.accountLabel}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {config.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            {config.description}
          </p>
        </div>

        <div className="min-w-64 border-l-2 border-border-secondary pl-4">
          <p className="text-xs font-medium tracking-wide text-muted">当前账户</p>
          <p className="mt-1 truncate text-base font-semibold text-foreground">
            {account?.displayName ??
              (accountQuery.isPending ? "正在读取账户" : "账户状态不可用")}
          </p>
          {accountQuery.isError ? (
            <button
              className={`mt-2 min-h-11 text-sm font-medium underline underline-offset-4 ${focusClass}`}
              type="button"
              onClick={() => void accountQuery.refetch()}
            >
              重新读取
            </button>
          ) : null}
        </div>
      </header>

      <dl className="grid border-b border-border sm:grid-cols-3">
        {config.metrics.map((metric) => (
          <div
            className="border-t border-border py-5 first:border-t-0 sm:border-t-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0"
            key={metric.label}
          >
            <dt className="text-sm text-muted">{metric.label}</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16 lg:py-12">
        <section aria-labelledby="workspace-tasks">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
            <h2
              className="text-lg font-semibold text-foreground"
              id="workspace-tasks"
            >
              待处理事项
            </h2>
            <span className="text-sm tabular-nums text-muted">
              {todoCount}
            </span>
          </div>

          {needsVerification ? (
            <div className="flex flex-col gap-4 border-b border-border py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">完成实名认证</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {verification?.detail}
                </p>
              </div>
              <Link
                className={`inline-flex min-h-11 shrink-0 items-center justify-center bg-accent px-4 text-sm font-medium text-accent-foreground hover:bg-accent-hover ${focusClass}`}
                href="/auth/verify"
              >
                前往认证
              </Link>
            </div>
          ) : pendingApplications.length > 0 ? (
            <ul className="divide-y divide-border">
              {pendingApplications.map((application) => (
                <li
                  className="flex min-h-16 items-center justify-between gap-4 py-4"
                  key={application.id}
                >
                  <span className="text-sm font-medium text-foreground">
                    {identityRoleLabels[application.requestedRole]}身份申请
                  </span>
                  <span className="text-sm text-muted">审核中</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border-b border-border py-10">
              <p className="font-medium text-foreground">{config.emptyTitle}</p>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                {config.emptyDescription}
              </p>
            </div>
          )}
        </section>

        <aside aria-labelledby="workspace-account" className="space-y-8">
          <section>
            <h2
              className="border-b border-border pb-3 text-lg font-semibold text-foreground"
              id="workspace-account"
            >
              账户认证
            </h2>
            <div className="py-5" aria-live="polite">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted">认证状态</span>
                <span className="border border-border-secondary bg-surface-secondary px-2.5 py-1 text-sm font-medium text-foreground">
                  {verification?.label ??
                    (accountQuery.isPending ? "读取中" : "不可用")}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">
                {verification?.detail ?? "暂时无法读取账户认证状态。"}
              </p>
            </div>
          </section>

          <nav aria-labelledby="workspace-links">
            <h2
              className="border-b border-border pb-3 text-lg font-semibold text-foreground"
              id="workspace-links"
            >
              快捷入口
            </h2>
            <ul className="divide-y divide-border">
              {config.links.map((link) => (
                <li key={link.href}>
                  <Link
                    className={`group flex min-h-12 items-center justify-between gap-4 text-sm font-medium text-foreground ${focusClass}`}
                    href={link.href}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className="text-muted transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </section>
  );
}
