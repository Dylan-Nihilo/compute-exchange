"use client";

import {useQuery} from "@tanstack/react-query";
import {useRouter} from "next/navigation";

import {BuyerBillingView} from "@/components/workspace/buyer-billing-view";
import {fetchAllBuyerOrders} from "@/lib/buyer-orders";

export default function BuyerBillingPage() {
  const router = useRouter();
  const ordersQuery = useQuery({
    queryKey: ["buyer", "billing"],
    queryFn: () => fetchAllBuyerOrders(),
  });

  return (
    <BuyerBillingView
      error={ordersQuery.isError
        ? ordersQuery.error instanceof Error
          ? ordersQuery.error.message
          : "账单数据暂时不可用"
        : null}
      isLoading={ordersQuery.isPending}
      isRetrying={ordersQuery.isFetching}
      orders={ordersQuery.data ?? []}
      onRetry={() => void ordersQuery.refetch()}
      onViewOrder={(orderNo) => router.push(`/console/buyer/orders/${orderNo}`)}
    />
  );
}
