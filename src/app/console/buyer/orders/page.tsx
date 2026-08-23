"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {
  BuyerOrdersView,
  type BuyerOrderListItem,
} from "@/components/workspace/buyer-orders-view";
import {
  confirmBuyerOrder,
  fetchBuyerOrders,
  type OrderStatus,
} from "@/lib/buyer-orders";
import {notify} from "@/lib/notify";

type StatusFilter = "all" | OrderStatus;
const ordersKey = ["buyer", "orders"] as const;

export default function BuyerOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderNumberFilter, setOrderNumberFilter] = useState("");
  const [confirmingOrder, setConfirmingOrder] = useState<BuyerOrderListItem | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setOrderNumberFilter(orderNumber.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [orderNumber]);

  const ordersQuery = useQuery({
    queryKey: [...ordersKey, status, orderNumberFilter],
    queryFn: () =>
      fetchBuyerOrders({
        status: status === "all" ? undefined : status,
        orderNo: orderNumberFilter || undefined,
      }),
  });
  const confirmMutation = useMutation({
    mutationFn: (orderNo: string) => confirmBuyerOrder(orderNo),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ordersKey});
      setConfirmingOrder(null);
      notify.success("已确认签收，订单进入履约中");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "确认签收失败"),
  });

  const orders = (ordersQuery.data?.orders ?? []).map((order) => ({
    ...order,
    productLabel: productLabel(order),
    supplierName: order.supplier_name || (order.self_operated ? "平台自营" : "—"),
  }));

  return (
    <>
      <BuyerOrdersView
        confirmingOrderNo={confirmMutation.isPending ? confirmingOrder?.order_no : null}
        error={ordersQuery.isError
          ? ordersQuery.error instanceof Error
            ? ordersQuery.error.message
            : "订单数据暂时不可用"
          : null}
        isLoading={ordersQuery.isPending}
        isRetrying={ordersQuery.isFetching}
        orderNumber={orderNumber}
        orders={orders}
        status={status}
        onConfirm={setConfirmingOrder}
        onOrderNumberChange={setOrderNumber}
        onRetry={() => void ordersQuery.refetch()}
        onStatusChange={setStatus}
        onViewDetails={(order) => router.push(`/console/buyer/orders/${order.order_no}`)}
      />

      <ConfirmDialog
        confirmLabel="确认签收"
        description={`确认已核验订单 ${confirmingOrder?.order_no ?? ""} 的资源与访问凭证无误？确认后订单将进入履约中。`}
        isPending={confirmMutation.isPending}
        onCancel={() => setConfirmingOrder(null)}
        onConfirm={() => {
          if (confirmingOrder) confirmMutation.mutate(confirmingOrder.order_no);
        }}
        open={Boolean(confirmingOrder)}
        title="确认签收资源"
      />
    </>
  );
}

function productLabel(order: BuyerOrderListItem) {
  const mode = {
    daily: "包天",
    hourly: "分时",
    monthly: "包月",
    perpetual: "买断",
    weekly: "包周",
  }[order.pricing_mode ?? ""];
  const product = order.gpu_model
    ? order.gpu_model.replace(/^NVIDIA\s+/i, "")
    : `算力资源 #${order.product_id}`;
  const unit = order.product_type === "colocation"
    ? "机柜"
    : order.product_type === "center" || order.product_type === "outright"
      ? "台"
      : order.gpu_model
        ? "卡"
        : "份";
  return [product, `${order.quantity}${unit}`, mode]
    .filter(Boolean)
    .join(" · ");
}
