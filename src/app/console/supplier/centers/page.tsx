"use client";

import {useQuery} from "@tanstack/react-query";

import {SupplierCentersView} from "@/components/workspace/supplier/supplier-centers-view";
import {fetchMyProductGroups} from "@/lib/supplier-workspace";

export default function SupplierCentersPage() {
  const groupsQuery = useQuery({
    queryKey: ["supplier", "products", "summary"],
    queryFn: () => fetchMyProductGroups(),
  });

  const centerGroup =
    (groupsQuery.data ?? []).find((group) => group.product_type === "center") ?? null;

  return (
    <SupplierCentersView
      error={groupsQuery.error instanceof Error ? groupsQuery.error.message : undefined}
      group={centerGroup}
      isError={groupsQuery.isError}
      isFetching={groupsQuery.isFetching}
      isPending={groupsQuery.isPending}
      onRetry={() => void groupsQuery.refetch()}
    />
  );
}
