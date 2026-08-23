"use client";

import {useQuery} from "@tanstack/react-query";
import {Button, Skeleton} from "@heroui/react";
import {useParams, useRouter} from "next/navigation";

import {ErrorState} from "@/components/system/operation-state";
import {
  buyerOrderStatusCopy,
  fetchBuyerOrders,
  isBuyerOrderNo,
} from "@/lib/buyer-orders";
import {formatDateTime} from "@/lib/format/date";

const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 2,
  style: "currency",
});

export default function BuyerOrderDetailPage() {
  const router = useRouter();
  const {orderId} = useParams<{orderId: string}>();
  const validOrderNo = isBuyerOrderNo(orderId);
  const orderQuery = useQuery({
    enabled: validOrderNo,
    queryKey: ["buyer", "orders", "detail", orderId],
    queryFn: () => fetchBuyerOrders({orderNo: orderId, pageSize: 20}),
  });
  const order = orderQuery.data?.orders.find(({order_no}) => order_no === orderId);

  if (orderQuery.isPending && validOrderNo) {
    return (
      <section className="mx-auto w-full max-w-[1228px] space-y-5 px-4 pt-6 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-52 rounded-xl" />
        <Skeleton className="h-80 rounded-[22px]" />
      </section>
    );
  }

  if (orderQuery.isError) {
    return (
      <ErrorState
        description={orderQuery.error instanceof Error ? orderQuery.error.message : undefined}
        isPending={orderQuery.isFetching}
        onRetry={() => void orderQuery.refetch()}
        title="订单详情暂时不可用"
      />
    );
  }

  if (!validOrderNo || !order) {
    return (
      <section className="grid min-h-[calc(100vh-72px)] place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-[#173447]">订单不存在</h1>
          <p className="mt-2 text-sm text-[#78909c]">请返回订单列表重新选择。</p>
          <Button className="mt-5" onPress={() => router.push("/console/buyer/orders")} variant="outline">
            返回我的订单
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <header className="flex items-center gap-4">
        <Button onPress={() => router.push("/console/buyer/orders")} variant="outline">
          返回
        </Button>
        <div>
          <p className="text-xs text-[#78909c]">订单详情</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#102b3b]">{order.order_no}</h1>
        </div>
      </header>

      <div className="rounded-[22px] border border-white/40 bg-white/35 p-6 shadow-[0_12px_28px_rgba(9,38,59,0.08)] backdrop-blur-xl">
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          <Detail label="状态" value={buyerOrderStatusCopy[order.status]} />
          <Detail label="订单金额" value={money.format(order.total_amount / 100)} />
          <Detail label="供给方" value={order.supplier_name || (order.self_operated ? "平台自营" : "—")} />
          <Detail label="商品" value={order.gpu_model || `算力资源 #${order.product_id}`} />
          <Detail label="采购数量" value={`${order.quantity} 份`} />
          <Detail label="计费周期" value={`${order.duration} 期`} />
          <Detail label="下单时间" value={formatDateTime(order.created_at)} />
          <Detail label="履约开始" value={order.lease_start_at ? formatDateTime(order.lease_start_at) : "—"} />
          <Detail label="履约结束" value={order.lease_end_at ? formatDateTime(order.lease_end_at) : "—"} />
        </dl>
      </div>
    </section>
  );
}

function Detail({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt className="text-xs text-[#78909c]">{label}</dt>
      <dd className="mt-2 text-sm font-medium text-[#244b61]">{value}</dd>
    </div>
  );
}
