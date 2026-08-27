"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useRouter, useSearchParams} from "next/navigation";
import {Suspense, useEffect, useRef, useState} from "react";

import {LoadingState} from "@/components/system/operation-state";
import {BuyerTicketsView} from "@/components/workspace/buyer-tickets-view";
import {SubmitTicketModal} from "@/components/workspace/tickets/submit-ticket-modal";
import {fetchBuyerOrders} from "@/lib/buyer-orders";
import {
  createTicket,
  fetchBuyerTickets,
  type CreateTicketInput,
  type TicketStatus,
} from "@/lib/buyer-tickets";
import {notify} from "@/lib/notify";

type StatusFilter = "all" | TicketStatus;
const pageSize = 10;
const ticketsKey = ["buyer", "tickets"] as const;
const ordersKey = ["buyer", "orders", "for-ticket"] as const;

function BuyerTicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const orderFromUrl = useRef<string | null>(null);

  // 订单详情页「发起工单」跳转: ?order=<orderNo> 自动打开弹窗并预选该订单。
  useEffect(() => {
    const orderNo = searchParams.get("order")?.trim();
    if (orderNo && orderFromUrl.current !== orderNo) {
      orderFromUrl.current = orderNo;
      setCreateOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeywordFilter(keyword.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const ticketsQuery = useQuery({
    queryKey: [...ticketsKey, status, keywordFilter, page],
    queryFn: () =>
      fetchBuyerTickets({
        status: status === "all" ? undefined : status,
        keyword: keywordFilter || undefined,
        page,
        pageSize,
      }),
  });
  const ordersQuery = useQuery({
    enabled: createOpen,
    queryKey: ordersKey,
    queryFn: () => fetchBuyerOrders({pageSize: 100}),
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({queryKey: ticketsKey});
      setCreateOpen(false);
      notify.success(`工单已提交(${result.ticket_no}), 平台运营会尽快处理`);
      router.push(`/console/buyer/tickets/${result.ticket_no}`);
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "工单提交失败"),
  });

  const total = ticketsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <BuyerTicketsView
        error={ticketsQuery.isError
          ? ticketsQuery.error instanceof Error
            ? ticketsQuery.error.message
            : "工单数据暂时不可用"
          : null}
        isLoading={ticketsQuery.isPending}
        isRetrying={ticketsQuery.isFetching}
        keyword={keyword}
        page={page}
        status={status}
        tickets={ticketsQuery.data?.tickets ?? []}
        totalPages={totalPages}
        onCreate={() => setCreateOpen(true)}
        onKeywordChange={setKeyword}
        onPageChange={setPage}
        onRetry={() => void ticketsQuery.refetch()}
        onStatusChange={(next) => {
          setStatus(next);
          setPage(1);
        }}
        onViewDetail={(ticketNo) => router.push(`/console/buyer/tickets/${ticketNo}`)}
      />

      <SubmitTicketModal
        isOrdersLoading={ordersQuery.isPending}
        isPending={createMutation.isPending}
        onCancel={() => setCreateOpen(false)}
        onSubmit={(input) => createMutation.mutate(input)}
        open={createOpen}
        orders={ordersQuery.data?.orders ?? []}
        preselectedOrderNo={orderFromUrl.current}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="正在加载工单售后" />}>
      <BuyerTicketsPage />
    </Suspense>
  );
}
