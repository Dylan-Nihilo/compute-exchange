"use client";

import {useQuery} from "@tanstack/react-query";

import {SupplierColocation} from "@/components/workspace/supplier/supplier-colocation";
import {fetchMyProductGroups} from "@/lib/supplier-workspace";

export default function SupplierColocationPage() {
  const groupsQuery = useQuery({
    queryKey: ["supplier", "products", "summary"],
    queryFn: () => fetchMyProductGroups(),
  });

  const group =
    (groupsQuery.data ?? []).find((item) => item.product_type === "colocation") ?? null;

  return (
    <SupplierColocation
      error={groupsQuery.error instanceof Error ? groupsQuery.error.message : undefined}
      group={group}
      isError={groupsQuery.isError}
      isFetching={groupsQuery.isFetching}
      isPending={groupsQuery.isPending}
      onRetry={() => void groupsQuery.refetch()}
    />
  );
}
