"use client";

import {useQuery} from "@tanstack/react-query";

import {SupplierHome} from "@/components/workspace/supplier/supplier-home";
import {
  fetchMyProductGroups,
  fetchMyQualifications,
  fetchSupplierOrders,
  fetchSupplierSettlementSummary,
} from "@/lib/supplier-workspace";

export default function SupplierWorkspacePage() {
  const groupsQuery = useQuery({
    queryKey: ["supplier", "products", "summary"],
    queryFn: () => fetchMyProductGroups(),
  });
  const ordersQuery = useQuery({
    queryKey: ["supplier", "orders", "fulfilling"],
    queryFn: () => fetchSupplierOrders({status: "provisioning", pageSize: 1}),
  });
  const settlementQuery = useQuery({
    queryKey: ["supplier", "settlements", "summary"],
    queryFn: () => fetchSupplierSettlementSummary(),
  });
  const qualificationsQuery = useQuery({
    queryKey: ["supplier", "qualifications"],
    queryFn: () => fetchMyQualifications(),
  });

  const groups = groupsQuery.data ?? [];
  const activeProducts = groups.reduce((sum, group) => sum + group.active_count, 0);
  const totalStock = groups.reduce((sum, group) => sum + group.total_stock, 0);
  const qualifications = qualificationsQuery.data ?? [];

  return (
    <SupplierHome
      isLoading={groupsQuery.isPending || qualificationsQuery.isPending}
      latestQualification={qualifications[0] ?? null}
      metrics={{
        activeProducts,
        totalStock,
        fulfillingOrders: ordersQuery.data?.total ?? 0,
      }}
      settlement={settlementQuery.data ?? {total_fen: 0, succeeded_fen: 0, pending_fen: 0}}
    />
  );
}
