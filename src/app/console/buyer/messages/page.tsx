"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {BuyerMessagesView} from "@/components/workspace/notifications/buyer-messages-view";
import {
  deleteNotification,
  fetchBuyerNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/buyer-notifications";
import {notify} from "@/lib/notify";

type TypeFilter = "all" | "system" | "order" | "ticket";
const pageSize = 10;
const messagesKey = ["buyer", "notifications"] as const;

export default function BuyerMessagesPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [markingId, setMarkingId] = useState<number | null>(null);

  const messagesQuery = useQuery({
    queryKey: [...messagesKey, type, page],
    queryFn: () =>
      fetchBuyerNotifications({
        type: type === "all" ? undefined : type,
        page,
        pageSize,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({queryKey: messagesKey});

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: async () => {
      await invalidate();
      setMarkingId(null);
    },
    onError: (error) => {
      setMarkingId(null);
      notify.error(error instanceof Error ? error.message : "标记已读失败");
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: async () => {
      await invalidate();
      notify.success("已全部标为已读");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "全部已读失败"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onSuccess: async () => {
      await invalidate();
      notify.success("已删除");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "删除失败"),
  });

  const data = messagesQuery.data;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <BuyerMessagesView
      error={messagesQuery.isError
        ? messagesQuery.error instanceof Error
          ? messagesQuery.error.message
          : "消息数据暂时不可用"
        : null}
      isLoading={messagesQuery.isPending}
      isMarkingAll={markAllMutation.isPending}
      isRetrying={messagesQuery.isFetching}
      markingId={markReadMutation.isPending ? markingId : null}
      notifications={data?.notifications ?? []}
      page={page}
      type={type}
      typeCounts={data?.typeCounts ?? {system: 0, order: 0, ticket: 0}}
      totalPages={totalPages}
      unread={data?.unread ?? 0}
      onDelete={(id) => deleteMutation.mutate(id)}
      onMarkAllRead={() => markAllMutation.mutate()}
      onMarkRead={(id) => {
        setMarkingId(id);
        markReadMutation.mutate(id);
      }}
      onPageChange={setPage}
      onRetry={() => void messagesQuery.refetch()}
      onTypeChange={(next) => {
        setType(next);
        setPage(1);
      }}
    />
  );
}
