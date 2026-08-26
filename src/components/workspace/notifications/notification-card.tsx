"use client";

import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";

import {notificationTypeCopy, type BuyerNotification} from "@/lib/buyer-notifications";
import {formatDateTime} from "@/lib/format/date";

// 消息卡片: 未读浅蓝底 + 蓝点 + 「标为已读」, 已读白底; 点击「查看详情」跳关联页面。
export function NotificationCard({
  isMarking = false,
  notification,
  onDelete,
  onMarkRead,
}: {
  isMarking?: boolean;
  notification: BuyerNotification;
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}) {
  const router = useRouter();
  const unread = notification.read_at === null;

  return (
    <article
      className={`rounded-[20px] border px-5 py-4 shadow-[0_10px_28px_-18px_rgba(14,48,69,0.12)] backdrop-blur-xl transition-colors ${
        unread
          ? "border-[#9fd4f5]/45 bg-[#d6f0fb]/55"
          : "border-[#afc4ce]/20 bg-white/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          aria-label={unread ? "未读" : "已读"}
          className={`mt-2 size-2 shrink-0 rounded-full ${unread ? "bg-[#0485f7]" : "bg-transparent"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#c3e2f5]/70 bg-[#e8f6fe]/80 px-2 py-0.5 text-[11px] text-[#1d63ae]">
              {notificationTypeCopy[notification.type]}
            </span>
            <h2 className={`truncate text-sm ${unread ? "font-semibold text-[#173447]" : "font-medium text-[#24495d]"}`}>
              {notification.title}
            </h2>
            <time className="ml-auto shrink-0 text-xs text-[#8aa0ab]">
              {formatDateTime(notification.created_at)}
            </time>
          </div>
          <p className="mt-1.5 break-words text-[13px] leading-5 text-[#5e7786]">
            {notification.content}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            {notification.link ? (
              <button
                className="text-xs font-medium text-[#1d63ae] hover:underline"
                onClick={() => router.push(notification.link)}
                type="button"
              >
                查看详情 →
              </button>
            ) : null}
            <div className="ml-auto flex items-center gap-1.5">
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
        </div>
      </div>
    </article>
  );
}
