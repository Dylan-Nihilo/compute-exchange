import {Skeleton} from "@heroui/react";
import type {ReactNode} from "react";

import {ErrorState} from "@/components/system/operation-state";

export const adminPanelClass =
  "rounded-[20px] border border-[#b9ccd5]/30 bg-white/70 shadow-[0_16px_36px_-28px_rgba(15,52,73,0.32)]";

export function AdminPage({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 pt-6 pb-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-[#c8d9e0]/55 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-[10px] font-semibold tracking-[0.16em] text-[#78909c] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.025em] text-[#102b3b] sm:text-[32px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6f8793]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function AdminPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${adminPanelClass} ${className}`}>{children}</section>;
}

export function AdminMetric({
  label,
  tone = "default",
  value,
}: {
  label: string;
  tone?: "default" | "danger" | "warning";
  value: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#b63b35]"
      : tone === "warning"
        ? "text-[#a25a13]"
        : "text-[#173447]";
  return (
    <div className="border-l border-[#c9d9df]/55 pl-4 first:border-l-0 first:pl-0">
      <p className="text-[11px] font-medium text-[#78909c]">{label}</p>
      <p className={`mt-2 text-[28px] leading-none font-semibold tracking-[-0.04em] ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

export function AdminTableShell({
  children,
  emptyDescription,
  emptyTitle,
  error,
  isLoading,
  onRetry,
}: {
  children: ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  error?: string;
  isLoading?: boolean;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-5">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton className="h-14 w-full rounded-xl" key={key} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="grid min-h-64 place-items-center p-6">
        <ErrorState description={error} onRetry={onRetry ?? (() => undefined)} title="数据暂时不可用" />
      </div>
    );
  }
  if (!children) {
    return (
      <div className="grid min-h-64 place-items-center px-6 text-center">
        <div>
          <h2 className="text-base font-semibold text-[#173447]">{emptyTitle}</h2>
          <p className="mt-2 text-sm text-[#78909c]">{emptyDescription}</p>
        </div>
      </div>
    );
  }
  return <div className="omnis-scrollbar-x overflow-x-auto">{children}</div>;
}

export function StatusBadge({status}: {status: string}) {
  const copy: Record<string, string> = {
    active: "进行中",
    new: "待跟进",
    assigned: "已分配",
    quoted: "已报价",
    approved: "已通过",
    cancelled: "已取消",
    closed: "已关闭",
    completed: "已完成",
    dismissed: "已忽略",
    draft: "草稿",
    frozen: "已冻结",
    issued: "已开票",
    paid: "已支付",
    pending: "待处理",
    pending_payment: "待支付",
    refunded: "已退款",
    processing: "处理中",
    provisioning: "交付中",
    rejected: "已驳回",
    resolved: "已处理",
    success: "已完成",
    verified: "已通过",
  };
  const tone = ["rejected", "frozen", "failed"].includes(status)
    ? "bg-[#fbe9e8] text-[#b63b35]"
    : ["pending", "processing", "provisioning", "paid"].includes(status)
      ? "bg-[#fff1de] text-[#a25a13]"
      : ["active", "approved", "completed", "issued", "resolved", "success", "verified"].includes(status)
        ? "bg-[#e8f4dd] text-[#507d19]"
        : "bg-[#edf2f4] text-[#647c88]";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${tone}`}>
      {copy[status] ?? status}
    </span>
  );
}

export const adminTableClass =
  "w-full min-w-[900px] border-collapse text-left text-[13px] text-[#24495d] [&_tbody_tr]:border-b [&_tbody_tr]:border-[#dce9ee]/70 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-[#f5fafc]/80 [&_tbody_tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-3.5 [&_th]:px-4";

export function AdminTableHead({children}: {children: ReactNode}) {
  return (
    <thead>
      <tr className="h-11 bg-[#e5f3f8]/75 text-[11px] font-semibold tracking-[0.04em] text-[#78909c] uppercase [&_th:first-child]:rounded-l-[13px] [&_th:last-child]:rounded-r-[13px]">
        {children}
      </tr>
    </thead>
  );
}
