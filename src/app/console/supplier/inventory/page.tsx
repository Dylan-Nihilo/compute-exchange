"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {ReportStockModal} from "@/components/workspace/supplier/report-stock-modal";
import {SupplierInventoryView} from "@/components/workspace/supplier/supplier-inventory-view";
import {notify} from "@/lib/notify";
import {
  fetchMyProducts,
  fetchResourceSyncs,
  submitPassiveResourceSync,
  type SubmitResourceSyncInput,
} from "@/lib/supplier-workspace";

const pageSize = 10;
const syncsKey = ["supplier", "resource-syncs"] as const;
const productsKey = ["supplier", "products", "list"] as const;

// 资源盘点页 (C-05): 盘点记录列表 + 机房余量上报。取数与变更在此, 展示在视图组件。
export default function SupplierInventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [reportOpen, setReportOpen] = useState(false);

  const syncsQuery = useQuery({
    queryKey: [...syncsKey, page],
    queryFn: () => fetchResourceSyncs({page, pageSize}),
  });
  const productsQuery = useQuery({
    queryKey: productsKey,
    queryFn: () => fetchMyProducts(),
  });

  const reportMutation = useMutation({
    mutationFn: (input: SubmitResourceSyncInput) => submitPassiveResourceSync(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({queryKey: syncsKey}),
        queryClient.invalidateQueries({queryKey: productsKey}),
      ]);
      setReportOpen(false);
      setPage(1);
      notify.success("余量已上报, 平台库存已更新");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "盘点上报失败"),
  });

  const totalPages = Math.max(1, Math.ceil((syncsQuery.data?.total ?? 0) / pageSize));

  return (
    <>
      <SupplierInventoryView
        errorMessage={syncsQuery.error instanceof Error ? syncsQuery.error.message : undefined}
        isError={syncsQuery.isError}
        isFetching={syncsQuery.isFetching}
        isPending={syncsQuery.isPending}
        onPageChange={setPage}
        onReport={() => setReportOpen(true)}
        onRetry={() => void syncsQuery.refetch()}
        page={page}
        products={productsQuery.data ?? []}
        syncs={syncsQuery.data?.syncs ?? []}
        total={syncsQuery.data?.total ?? 0}
        totalPages={totalPages}
      />
      <ReportStockModal
        isPending={reportMutation.isPending}
        onCancel={() => setReportOpen(false)}
        onSubmit={(input) => reportMutation.mutate(input)}
        open={reportOpen}
        products={productsQuery.data ?? []}
      />
    </>
  );
}
