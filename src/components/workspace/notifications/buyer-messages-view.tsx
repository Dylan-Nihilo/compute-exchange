"use client";

import {Button, Skeleton} from "@heroui/react";
import {Bell} from "lucide";

import {ErrorState} from "@/components/system/operation-state";
import {NotificationCard} from "@/components/workspace/notifications/notification-card";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import type {
  BuyerNotification,
  NotificationTypeCounts,
} from "@/lib/buyer-notifications";

type TypeFilter = "all" | "system" | "order" | "ticket";

export type BuyerMessagesViewProps = {
  error?: string | null;
  isLoading?: boolean;
  isMarkingAll?: boolean;
  isRetrying?: boolean;
  markingId?: number | null;
  notifications: readonly BuyerNotification[];
  page: number;
  type: TypeFilter;
  typeCounts: NotificationTypeCounts;
  totalPages: number;
  unread: number;
  onDelete: (id: number) => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: number) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onTypeChange: (type: TypeFilter) => void;
};

export function BuyerMessagesView({
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
}: BuyerMessagesViewProps) {
  const total = typeCounts.system + typeCounts.order + typeCounts.ticket;
  const tabs: readonly {id: TypeFilter; label: string; count: number}[] = [
    {id: "all", label: "全部消息", count: total},
    {id: "system", label: "系统通知", count: typeCounts.system},
    {id: "order", label: "订单动态", count: typeCounts.order},
    {id: "ticket", label: "工单消息", count: typeCounts.ticket},
  ];

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        actions={
          <Button
            className="h-10 min-w-24 rounded-xl px-4 text-sm"
            isDisabled={unread === 0}
            isPending={isMarkingAll}
            onPress={onMarkAllRead}
            variant="outline"
          >
            全部已读
          </Button>
        }
        title="消息中心"
      />

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

      <div aria-busy={isLoading} className="min-h-[380px]">
        {isLoading ? (
          <MessageListSkeleton />
        ) : error ? (
          <div className="grid min-h-[380px] place-items-center">
            <ErrorState
              description={error}
              isPending={isRetrying}
              onRetry={onRetry}
              title="消息数据暂时不可用"
            />
          </div>
        ) : notifications.length ? (
          <ul className="space-y-3">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <NotificationCard
                  isMarking={markingId === notification.id}
                  notification={notification}
                  onDelete={onDelete}
                  onMarkRead={onMarkRead}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="min-h-[380px] rounded-[20px] border border-[#afc4ce]/20 bg-white/60 backdrop-blur-xl">
            <EmptyState
              description={type === "all"
                ? "订单交付、退款、工单回复和发票进展会第一时间出现在这里。"
                : "该类型下暂时没有消息。"}
              icon={Bell}
              title="暂无消息"
            />
          </div>
        )}
      </div>

      {!isLoading && !error ? (
        <ListPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      ) : null}
    </section>
  );
}

function MessageListSkeleton() {
  return (
    <div className="space-y-3">
      {["s1", "s2", "s3"].map((key) => (
        <Skeleton className="h-24 w-full rounded-[20px]" key={key} />
      ))}
    </div>
  );
}
