"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useSearchParams} from "next/navigation";
import {Suspense, useEffect, useRef, useState} from "react";

import {LoadingState} from "@/components/system/operation-state";
import {ApplyInvoiceDialog} from "@/components/workspace/apply-invoice-dialog";
import {BuyerInvoicesView} from "@/components/workspace/buyer-invoices-view";
import {InvoiceTitleDialog} from "@/components/workspace/invoice-title-dialog";
import {
  applyInvoice,
  fetchBillableOrders,
  fetchBuyerInvoices,
  fetchInvoiceTitle,
  saveInvoiceTitle,
  type SaveInvoiceTitleInput,
} from "@/lib/buyer-invoices";
import {notify} from "@/lib/notify";

const pageSize = 10;
const invoicesKey = ["buyer", "invoices", "list"] as const;
const billableKey = ["buyer", "invoices", "billable-orders"] as const;
const titleKey = ["buyer", "invoices", "title"] as const;

function BuyerInvoicesPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [applyOpen, setApplyOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const applyFromUrl = useRef<string | null>(null);

  // 订单详情页「申请发票」跳转: ?apply=<orderNo> 自动打开申请弹窗并预选该订单。
  useEffect(() => {
    const orderNo = searchParams.get("apply")?.trim();
    if (orderNo && applyFromUrl.current !== orderNo) {
      applyFromUrl.current = orderNo;
      setApplyOpen(true);
    }
  }, [searchParams]);

  const titleQuery = useQuery({
    queryKey: titleKey,
    queryFn: () => fetchInvoiceTitle(),
  });
  const invoicesQuery = useQuery({
    queryKey: [...invoicesKey, page],
    queryFn: () => fetchBuyerInvoices({page, pageSize}),
  });
  const billableQuery = useQuery({
    enabled: applyOpen,
    queryKey: billableKey,
    queryFn: () => fetchBillableOrders(),
  });

  const titleMutation = useMutation({
    mutationFn: (input: SaveInvoiceTitleInput) => saveInvoiceTitle(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: titleKey});
      setTitleOpen(false);
      notify.success("开票信息已保存");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "开票信息保存失败"),
  });

  const applyMutation = useMutation({
    mutationFn: (orderNos: string[]) => applyInvoice(orderNos),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: invoicesKey}),
        queryClient.invalidateQueries({queryKey: billableKey}),
      ]);
      setApplyOpen(false);
      notify.success(`开票申请已提交(${result.invoice_no}), 请等待平台审核`);
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "开票申请提交失败"),
  });

  const total = invoicesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <BuyerInvoicesView
        error={invoicesQuery.isError
          ? invoicesQuery.error instanceof Error
            ? invoicesQuery.error.message
            : "发票数据暂时不可用"
          : null}
        invoices={invoicesQuery.data?.invoices ?? []}
        isLoading={invoicesQuery.isPending}
        isRetrying={invoicesQuery.isFetching}
        page={page}
        title={titleQuery.data ?? null}
        titleError={titleQuery.isError
          ? titleQuery.error instanceof Error
            ? titleQuery.error.message
            : "开票信息暂时不可用"
          : null}
        totalPages={totalPages}
        onApply={() => setApplyOpen(true)}
        onEditTitle={() => setTitleOpen(true)}
        onPageChange={setPage}
        onRetry={() => void invoicesQuery.refetch()}
        onRetryTitle={() => void titleQuery.refetch()}
      />

      <InvoiceTitleDialog
        initial={titleQuery.data ?? null}
        isPending={titleMutation.isPending}
        onCancel={() => setTitleOpen(false)}
        onSubmit={(input) => titleMutation.mutate(input)}
        open={titleOpen}
      />

      <ApplyInvoiceDialog
        isOrdersLoading={billableQuery.isPending}
        isPending={applyMutation.isPending}
        onCancel={() => setApplyOpen(false)}
        onEditTitle={() => {
          setApplyOpen(false);
          setTitleOpen(true);
        }}
        onRetryOrders={() => void billableQuery.refetch()}
        onSubmit={(orderNos) => applyMutation.mutate(orderNos)}
        open={applyOpen}
        orders={billableQuery.data ?? []}
        ordersError={billableQuery.isError
          ? billableQuery.error instanceof Error
            ? billableQuery.error.message
            : "可开票订单暂时不可用"
          : null}
        preselected={applyFromUrl.current}
        title={titleQuery.data ?? null}
        titleError={titleQuery.isError
          ? titleQuery.error instanceof Error
            ? titleQuery.error.message
            : "开票信息暂时不可用"
          : null}
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="正在加载发票管理" />}>
      <BuyerInvoicesPage />
    </Suspense>
  );
}
