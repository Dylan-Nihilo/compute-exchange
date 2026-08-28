"use client";

import {useQuery} from "@tanstack/react-query";

import {SupplierAnalytics} from "@/components/workspace/supplier/supplier-analytics";
import {
  fetchMyProductGroups,
  fetchSupplierOrders,
  fetchSupplierSettlementSummary,
} from "@/lib/supplier-workspace";

const zeroSettlement = {total_fen: 0, succeeded_fen: 0, pending_fen: 0};

export default function SupplierAnalyticsPage() {
  const groupsQuery = useQuery({
    queryKey: ["supplier", "products", "summary"],
    queryFn: () => fetchMyProductGroups(),
  });
  // pageSize=1 只取 statusCounts 做订单状态分布, 不拉列表数据。
  const ordersQuery = useQuery({
    queryKey: ["supplier", "orders", "status-counts"],
    queryFn: () => fetchSupplierOrders({pageSize: 1}),
  });
  const settlementQuery = useQuery({
    queryKey: ["supplier", "settlements", "summary"],
    queryFn: () => fetchSupplierSettlementSummary(),
  });

  const queries = [groupsQuery, ordersQuery, settlementQuery];

  return (
    <SupplierAnalytics
      groups={groupsQuery.data ?? []}
      isError={queries.some((query) => query.isError)}
      isPending={queries.some((query) => query.isPending)}
      onRetry={() => queries.forEach((query) => void query.refetch())}
      settlement={settlementQuery.data ?? zeroSettlement}
      statusCounts={ordersQuery.data?.statusCounts ?? {}}
    />
  );
}
