"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, Skeleton} from "@heroui/react";
import {useState} from "react";

import {ErrorState} from "@/components/system/operation-state";
import {DeliverOrderModal} from "@/components/workspace/supplier/deliver-order-modal";
import {OrderDetailModal} from "@/components/workspace/supplier/order-detail-modal";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {buyerOrderStatusCopy} from "@/lib/buyer-orders";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";
import {
  deliverOrder,
  fetchSupplierOrders,
  type DeliverOrderInput,
  type SupplierOrder,
} from "@/lib/supplier-workspace";

const pageSize = 10;
const ordersKey = ["supplier", "orders"] as const;
const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

// Tab 语义组(设计稿): 待支付=pending_payment, 待交付=paid+provisioning,
// 进行中=active, 已完成=终态合集(completed/refunded/cancelled/frozen)。
const tabs = [
  {id: "", label: "全部订单", statuses: [] as string[]},
  {id: "pending_payment", label: "待支付", statuses: ["pending_payment"]},
  {id: "paid,provisioning", label: "待交付", statuses: ["paid", "provisioning"]},
  {id: "active", label: "进行中", statuses: ["active"]},
  {id: "completed,refunded,cancelled,frozen", label: "已完成", statuses: ["completed", "refunded", "cancelled", "frozen"]},
] as const;

const statusTone: Record<string, string> = {
  pending_payment: "bg-[#fff3e0] text-[#b25e09]",
  paid: "bg-[#e3f2fd] text-[#1d63ae]",
  provisioning: "bg-[#e3f2fd] text-[#1d63ae]",
  active: "bg-[#e5f7d9] text-[#4c7c0f]",
  completed: "bg-[#edf1f3] text-[#78909c]",
  cancelled: "bg-[#edf1f3] text-[#78909c]",
  refunding: "bg-[#fdeaea] text-[#c4392f]",
  refunded: "bg-[#edf1f3] text-[#78909c]",
  frozen: "bg-[#fdeaea] text-[#c4392f]",
};

export default function SupplierOrdersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("");
  const [page, setPage] = useState(1);
  const [detailTarget, setDetailTarget] = useState<SupplierOrder | null>(null);
  const [deliverTarget, setDeliverTarget] = useState<SupplierOrder | null>(null);

  const ordersQuery = useQuery({
    queryKey: [...ordersKey, tab, page],
    queryFn: () => fetchSupplierOrders({status: tab || undefined, page, pageSize}),
  });

  const deliverMutation = useMutation({
    mutationFn: ({orderNo, input}: {orderNo: string; input: DeliverOrderInput}) => deliverOrder(orderNo, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ordersKey});
      setDeliverTarget(null);
      notify.success("交付已提交, 等待买家确认签收");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "交付提交失败"),
  });

  const counts = ordersQuery.data?.statusCounts ?? {};
  const countOf = (statuses: readonly string[]) =>
    statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const totalAll = Object.values(counts).reduce((sum, count) => sum + count, 0);

  const totalPages = Math.max(1, Math.ceil((ordersQuery.data?.total ?? 0) / pageSize));
  const orders = ordersQuery.data?.orders ?? [];

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader title="订单管理" />

      <div aria-label="按状态筛选" className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((item) => {
          const count = item.statuses.length === 0 ? totalAll : countOf(item.statuses);
          const active = tab === item.id;
          return (
            <button
              aria-selected={active}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-[#173447] text-white"
                  : "border border-[#dce9ee] bg-white/60 text-[#5e7786] hover:bg-white/80"
              }`}
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setPage(1);
              }}
              role="tab"
              type="button"
            >
              {item.label}({count})
            </button>
          );
        })}
      </div>

      <GlassCard className="px-5 py-5 sm:px-6">
        <div aria-busy={ordersQuery.isPending} className="min-h-[360px]">
          {ordersQuery.isPending ? (
            <div className="space-y-3">
              {["s1", "s2", "s3", "s4"].map((key) => <Skeleton className="h-14 w-full rounded-xl" key={key} />)}
            </div>
          ) : ordersQuery.isError ? (
            <ErrorState
              description={ordersQuery.error instanceof Error ? ordersQuery.error.message : undefined}
              isPending={ordersQuery.isFetching}
              onRetry={() => void ordersQuery.refetch()}
              title="订单数据暂时不可用"
            />
          ) : orders.length ? (
            <div className="omnis-scrollbar-x">
              <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
                <caption className="sr-only">供给方履约订单</caption>
                <colgroup>
                  <col className="w-[190px]" />
                  <col className="w-[180px]" />
                  <col className="w-[70px]" />
                  <col className="w-[120px]" />
                  <col className="w-[110px]" />
                  <col className="w-[100px]" />
                  <col className="w-[140px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">订单号</th>
                    <th className="px-4" scope="col">产品</th>
                    <th className="px-4" scope="col">数量</th>
                    <th className="px-4" scope="col">总价</th>
                    <th className="px-4" scope="col">平台费</th>
                    <th className="px-4" scope="col">状态</th>
                    <th className="px-4" scope="col">下单时间</th>
                    <th className="rounded-r-[14px] px-4 text-right" scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr className="border-b border-[#dce9ee]/75 last:border-0" key={order.id}>
                      <th className="px-4 py-3.5 text-[13px] font-medium text-[#173447]" scope="row">
                        {order.order_no}
                      </th>
                      <td className="px-4 py-3.5">
                        <p className="truncate text-[13px] font-medium text-[#24495d]">
                          {(order.gpu_model || "算力资源").replace(/^NVIDIA\s+/i, "")}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8aa0ab]">PRD-#{order.product_id}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{order.quantity}</td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-[#173447]">
                        {money.format(order.total_amount / 100)}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                        {money.format(order.platform_fee / 100)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[order.status] ?? statusTone.pending_payment}`}>
                          {buyerOrderStatusCopy[order.status as keyof typeof buyerOrderStatusCopy] ?? order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#78909c]">
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          className="h-8 min-w-20 px-3 text-xs"
                          onPress={() => setDetailTarget(order)}
                          variant="ghost"
                        >
                          查看详情
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="买家下单并支付后, 订单会出现在这里等待你交付。"
              title="暂时没有订单"
            />
          )}
        </div>

        {!ordersQuery.isPending && !ordersQuery.isError ? (
          <div className="mt-4">
            <ListPagination align="center" page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </GlassCard>

      <OrderDetailModal
        onClose={() => setDetailTarget(null)}
        onDeliver={(order) => {
          setDetailTarget(null);
          setDeliverTarget(order);
        }}
        open={detailTarget !== null}
        order={detailTarget}
      />

      <DeliverOrderModal
        isPending={deliverMutation.isPending}
        onCancel={() => setDeliverTarget(null)}
        onSubmit={(input) => {
          if (deliverTarget) {
            deliverMutation.mutate({orderNo: deliverTarget.order_no, input});
          }
        }}
        open={deliverTarget !== null}
        order={deliverTarget}
      />
    </section>
  );
}
