"use client";

import {Button, Skeleton} from "@heroui/react";
import {Bell} from "lucide";
import Image from "next/image";
import {useRouter} from "next/navigation";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {notificationTypeCopy, type NotificationType} from "@/lib/buyer-notifications";
import {formatDate, formatDateTime, toIsoTimestamp} from "@/lib/format/date";
import type {SupplierNotification} from "@/lib/supplier-notifications";

type TypeFilter = "all" | NotificationType;

const supplierAssets = "/images/supplier-workspace";
const buyerAssets = "/images/buyer-workspace";

// Per-type icon tile, aligned with the design's Order/Settlement/Qualification row variants.
const typeVisual: Record<NotificationType, {icon: string; tileClass: string}> = {
  order: {icon: `${supplierAssets}/package-check.svg`, tileClass: "bg-[rgba(228,244,251,0.76)]"},
  system: {icon: `${supplierAssets}/file-clock.svg`, tileClass: "bg-[rgba(252,244,219,0.76)]"},
  ticket: {icon: `${buyerAssets}/life-buoy.svg`, tileClass: "bg-[rgba(230,248,244,0.76)]"},
};

export type SupplierMessagesViewProps = {
  error?: string | null;
  isLoading?: boolean;
  isMarkingAll?: boolean;
  isRetrying?: boolean;
  markingId?: number | null;
  notifications: readonly SupplierNotification[];
  page: number;
  type: TypeFilter;
  typeCounts: Record<NotificationType, number>;
  totalPages: number;
  unread: number;
  onDelete: (id: number) => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: number) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onTypeChange: (type: TypeFilter) => void;
};

export function SupplierMessagesView({
  error = null,
  isLoading = false,
  isMarkingAll = false,
  isRetrying = false,
  markingId = null,
  notifications,
  page,
  type,
  typeCounts,
  totalPages,
  unread,
  onDelete,
  onMarkAllRead,
  onMarkRead,
  onPageChange,
  onRetry,
  onTypeChange,
}: SupplierMessagesViewProps) {
  const total = typeCounts.system + typeCounts.order + typeCounts.ticket;
  const tabs: readonly {id: TypeFilter; label: string; count: number}[] = [
    {id: "all", label: "全部消息", count: total},
    {id: "order", label: notificationTypeCopy.order, count: typeCounts.order},
    {id: "system", label: notificationTypeCopy.system, count: typeCounts.system},
    {id: "ticket", label: notificationTypeCopy.ticket, count: typeCounts.ticket},
  ];

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#173447]">消息中心</h1>
          <p className="mt-1 text-[13px] text-[#5c788a]">查看订单、结算与资质相关通知</p>
        </div>
        <Button
          className="h-10 min-w-24 rounded-xl px-4 text-sm"
          isDisabled={unread === 0}
          isPending={isMarkingAll}
          onPress={onMarkAllRead}
          variant="outline"
        >
          全部已读
        </Button>
      </header>

      <div aria-label="按类型筛选" className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((tab) => (
          <button
            aria-selected={type === tab.id}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
              type === tab.id
                ? "bg-[#173447] text-white"
                : "border border-[#dce9ee] bg-white/60 text-[#5e7786] hover:bg-white/80"
            }`}
            key={tab.id}
            onClick={() => onTypeChange(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}({tab.count})
          </button>
        ))}
      </div>

      <GlassCard className="px-4 py-4 sm:px-6 sm:py-5">
        <div aria-busy={isLoading} className="min-h-[360px]">
          {isLoading ? (
            <MessageListSkeleton />
          ) : error ? (
            <div className="grid min-h-[360px] place-items-center">
              <ErrorState
                description={error}
                isPending={isRetrying}
                onRetry={onRetry}
                title="消息数据暂时不可用"
              />
            </div>
          ) : notifications.length ? (
            <ul className="space-y-2.5">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <MessageRow
                    isMarking={markingId === notification.id}
                    notification={notification}
                    onDelete={onDelete}
                    onMarkRead={onMarkRead}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid min-h-[360px] place-items-center">
              <EmptyState
                description={type === "all"
                  ? "订单接单、结算到账和资质审核进展会第一时间出现在这里。"
                  : "该类型下暂时没有消息。"}
                icon={Bell}
                title="暂无消息"
              />
            </div>
          )}
        </div>

        {!isLoading && !error ? (
          <div className="mt-4">
            <ListPagination align="center" page={page} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        ) : null}
      </GlassCard>
    </section>
  );
}

// 消息行(设计稿 Row/Order|Settlement|Qualification): 类型图标 + 标题/内容 + 相对时间 + 操作。
function MessageRow({
  isMarking = false,
  notification,
  onDelete,
  onMarkRead,
}: {
  isMarking?: boolean;
  notification: SupplierNotification;
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}) {
  const router = useRouter();
  const unread = notification.read_at === null;
  const visual = typeVisual[notification.type];

  return (
    <article
      className={`flex items-center gap-4 rounded-[16px] border px-4 py-4 transition-colors ${
        unread
          ? "border-[#9fd4f5]/45 bg-[#d6f0fb]/40"
          : "border-white/55 bg-white/40"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-white/70 ${visual.tileClass}`}
      >
        <Image alt="" height={18} src={visual.icon} width={18} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            aria-label={unread ? "未读" : "已读"}
            className={`size-1.5 shrink-0 rounded-full ${unread ? "bg-[#0485f7]" : "bg-transparent"}`}
          />
          <h2 className={`truncate text-[15px] leading-[22px] ${unread ? "font-semibold text-[#0c1a25]" : "font-medium text-[#213645]"}`}>
            {notification.title}
          </h2>
          <span className="shrink-0 rounded-full border border-[#c3e2f5]/70 bg-[#e8f6fe]/80 px-2 py-0.5 text-[11px] text-[#1d63ae]">
            {notificationTypeCopy[notification.type]}
          </span>
        </div>
        <p className="mt-1 break-words pl-3.5 text-[13px] leading-5 text-[#5c788a]">
          {notification.content}
        </p>
        <div className="mt-2 flex items-center gap-2 pl-3.5">
          {unread ? (
            <Button
              className="h-7 min-w-20 px-3 text-xs"
              isPending={isMarking}
              onPress={() => onMarkRead(notification.id)}
              variant="outline"
            >
              标为已读
            </Button>
          ) : null}
          <Button
            aria-label="删除这条消息"
            className="h-7 w-7 min-w-7 px-0 text-xs text-[#9cb0ba]"
            onPress={() => onDelete(notification.id)}
            variant="ghost"
          >
            ✕
          </Button>
        </div>
      </div>

      <time
        className="w-[104px] shrink-0 text-right text-xs leading-5 text-[#5c788a]"
        dateTime={toIsoTimestamp(notification.created_at)}
        title={formatDateTime(notification.created_at)}
      >
        {formatRelativeTime(notification.created_at)}
      </time>

      {notification.link ? (
        <button
          aria-label="查看详情"
          className="flex size-5 shrink-0 items-center justify-center"
          onClick={() => router.push(notification.link)}
          type="button"
        >
          <Image alt="" height={16} src={`${buyerAssets}/chevron-right.svg`} width={16} />
        </button>
      ) : (
        <span className="size-5 shrink-0" />
      )}
    </article>
  );
}

function MessageListSkeleton() {
  return (
    <div className="space-y-2.5">
      {["s1", "s2", "s3"].map((key) => (
        <Skeleton className="h-[88px] w-full rounded-[16px]" key={key} />
      ))}
    </div>
  );
}

// 相对时间(设计稿: 5分钟前/2小时前/昨天), 超过一周回退到绝对日期。
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return "刚刚";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}分钟前`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}小时前`;
  if (diffMs < 172_800_000) return "昨天";
  if (diffMs < 604_800_000) return `${Math.floor(diffMs / 86_400_000)}天前`;
  return formatDate(iso);
}
