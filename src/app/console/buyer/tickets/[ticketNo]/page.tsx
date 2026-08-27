"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, Skeleton, Spinner, TextArea, TextField} from "@heroui/react";
import {useParams, useRouter} from "next/navigation";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {ErrorState} from "@/components/system/operation-state";
import {TicketConversation} from "@/components/workspace/tickets/ticket-conversation";
import {TicketStatusBadge} from "@/components/workspace/tickets/ticket-status-badge";
import {TicketTypeChip} from "@/components/workspace/tickets/ticket-type-chip";
import {
  appendTicketMessage,
  closeTicket,
  fetchBuyerTicketDetail,
  isTicketNo,
  ticketStatusCopy,
} from "@/lib/buyer-tickets";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";

const cardClass =
  "rounded-[20px] border border-[#afc4ce]/20 bg-white/60 shadow-[0_10px_28px_-18px_rgba(14,48,69,0.12)] backdrop-blur-xl";

export default function BuyerTicketDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {ticketNo} = useParams<{ticketNo: string}>();
  const validTicketNo = isTicketNo(ticketNo);
  const [reply, setReply] = useState("");
  const [closeConfirm, setCloseConfirm] = useState(false);

  const detailKey = ["buyer", "tickets", "detail", ticketNo] as const;
  const detailQuery = useQuery({
    enabled: validTicketNo,
    queryKey: detailKey,
    queryFn: () => fetchBuyerTicketDetail(ticketNo),
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => appendTicketMessage(ticketNo, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: detailKey});
      setReply("");
      notify.success("回复已发送");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "回复发送失败"),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeTicket(ticketNo),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: detailKey}),
        queryClient.invalidateQueries({queryKey: ["buyer", "tickets"]}),
      ]);
      setCloseConfirm(false);
      notify.success("工单已关闭");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "工单关闭失败"),
  });

  if (detailQuery.isPending && validTicketNo) return <DetailSkeleton />;

  if (detailQuery.isError) {
    return (
      <ErrorState
        description={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
        isPending={detailQuery.isFetching}
        onRetry={() => void detailQuery.refetch()}
        title="工单详情暂时不可用"
      />
    );
  }

  if (!validTicketNo || !detailQuery.data) {
    return (
      <section className="grid min-h-[calc(100vh-72px)] place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-[#173447]">工单不存在</h1>
          <p className="mt-2 text-sm text-[#78909c]">请返回工单列表重新选择。</p>
          <Button className="mt-5" onPress={() => router.push("/console/buyer/tickets")} variant="outline">
            返回工单列表
          </Button>
        </div>
      </section>
    );
  }

  const {ticket, messages} = detailQuery.data;
  const canReply = ticket.status === "pending" || ticket.status === "processing";
  const canClose = ticket.status !== "closed";

  return (
    <section className="mx-auto w-full max-w-[1228px] px-4 pt-8 pb-10 sm:px-6 xl:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Button className="h-9 min-w-16 px-4 text-sm" onPress={() => router.push("/console/buyer/tickets")} variant="outline">
            返回
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-6 text-[#173447]">工单详情</h1>
            <p className="mt-1 truncate text-xs text-[#7b929e]">
              {ticket.ticket_no} · {ticketStatusCopy[ticket.status]}
            </p>
          </div>
        </div>
        {canClose ? (
          <Button
            className="h-9 min-w-24 px-4 text-xs"
            isPending={closeMutation.isPending}
            onPress={() => setCloseConfirm(true)}
            variant="outline"
          >
            关闭工单
          </Button>
        ) : null}
      </header>

      <section className={`${cardClass} mt-5 px-5 py-5 sm:px-6`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <TicketStatusBadge status={ticket.status} />
          <TicketTypeChip type={ticket.type} />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-[#173447]">{ticket.title}</h2>
        <dl className="mt-4 grid gap-3 text-xs text-[#78909c] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt>关联订单</dt>
            <dd className="mt-1">
              <button
                className="font-medium text-[#1d63ae] hover:underline"
                onClick={() => router.push(`/console/buyer/orders/${ticket.order_no}`)}
                type="button"
              >
                {ticket.order_no}
              </button>
            </dd>
          </div>
          <div>
            <dt>提交时间</dt>
            <dd className="mt-1 text-[#24495d]">{formatDateTime(ticket.created_at)}</dd>
          </div>
          <div>
            <dt>完结时间</dt>
            <dd className="mt-1 text-[#24495d]">{ticket.resolved_at ? formatDateTime(ticket.resolved_at) : "—"}</dd>
          </div>
          <div>
            <dt>关闭时间</dt>
            <dd className="mt-1 text-[#24495d]">{ticket.closed_at ? formatDateTime(ticket.closed_at) : "—"}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="沟通记录" className={`${cardClass} mt-4 px-5 py-5 sm:px-6`}>
        <h2 className="text-[15px] font-semibold text-[#173447]">沟通记录</h2>
        <div className="mt-5">
          <TicketConversation messages={messages} />
        </div>

        {canReply ? (
          <div className="mt-6 border-t border-[#dce9ee] pt-5">
            <TextField fullWidth className="gap-2" value={reply} variant="secondary" onChange={setReply}>
              <TextArea
                aria-label="补充回复"
                className="rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 py-2.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]"
                placeholder="补充问题进展或回复运营…"
                rows={3}
              />
            </TextField>
            <div className="mt-3 flex justify-end">
              <Button
                isDisabled={reply.trim().length < 2}
                isPending={replyMutation.isPending}
                onPress={() => replyMutation.mutate(reply.trim())}
                variant="primary"
              >
                {replyMutation.isPending ? (
                  <>
                    <Spinner aria-hidden="true" color="current" size="sm" />
                    正在发送
                  </>
                ) : (
                  "发送回复"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-6 border-t border-[#dce9ee] pt-5 text-center text-xs text-[#9cb0ba]">
            {ticket.status === "resolved" ? "工单已完结, 如有新问题请重新提交工单。" : "工单已关闭, 无法继续回复。"}
          </p>
        )}
      </section>

      <ConfirmDialog
        confirmLabel="关闭工单"
        description={`确定关闭工单 ${ticket.ticket_no} 吗? 关闭后无法继续回复, 该操作不可撤销。`}
        isDestructive
        isPending={closeMutation.isPending}
        onCancel={() => setCloseConfirm(false)}
        onConfirm={() => closeMutation.mutate()}
        open={closeConfirm}
        title="关闭工单"
      />
    </section>
  );
}

function DetailSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1228px] space-y-5 px-4 pt-8 sm:px-6 xl:px-8">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-[20px]" />
      <Skeleton className="h-96 w-full rounded-[20px]" />
    </section>
  );
}
