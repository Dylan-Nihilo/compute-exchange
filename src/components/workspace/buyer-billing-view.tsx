"use client";

import {
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  Pagination,
  Select,
  Skeleton,
  TextField,
} from "@heroui/react";
import {useMemo, useState} from "react";

import {ErrorState} from "@/components/system/operation-state";
import {
  AnimatedNumber,
  AnimatedNumberGroup,
} from "@/components/system/animated-number";
import {
  buyerOrderStatusCopy,
  filterBuyerBillingOrders,
  summarizeBuyerBilling,
  type BuyerBillingStatusFilter,
  type BuyerOrder,
  type OrderStatus,
} from "@/lib/buyer-orders";
import {formatDateTime} from "@/lib/format/date";

const pageSize = 8;
const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});
const currencyFormat = {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
} as const;
const statusOptions: readonly {id: BuyerBillingStatusFilter; label: string}[] = [
  {id: "all", label: "全部账单"},
  {id: "pending", label: "待支付"},
  {id: "paid", label: "已支付"},
  {id: "refund", label: "退款相关"},
];

export function BuyerBillingView({
  error = null,
  isLoading = false,
  isRetrying = false,
  orders,
  onRetry,
  onViewOrder,
}: {
  error?: string | null;
  isLoading?: boolean;
  isRetrying?: boolean;
  orders: readonly BuyerOrder[];
  onRetry: () => void;
  onViewOrder: (orderNo: string) => void;
}) {
  const [status, setStatus] = useState<BuyerBillingStatusFilter>("all");
  const [orderNumber, setOrderNumber] = useState("");
  const [page, setPage] = useState(1);
  const summary = useMemo(() => summarizeBuyerBilling(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterBuyerBillingOrders(orders, status, orderNumber),
    [orderNumber, orders, status],
  );
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] text-[#102b3b] sm:text-[32px]">
          账单中心
        </h1>
        <p className="mt-1 text-sm text-[#78909c]">按订单查看应付、已支付与退款状态</p>
      </header>

      {isLoading ? (
        <BillingSummarySkeleton />
      ) : (
        <dl className="grid overflow-hidden rounded-[20px] border border-white/50 bg-white/50 shadow-[0_10px_26px_rgba(9,38,59,0.06)] sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="已支付订单" value={summary.paidMinor / 100} />
          <SummaryItem label="本月订单支出" value={summary.monthSpendMinor / 100} />
          <SummaryItem label="已退款" value={summary.refundedMinor / 100} />
          <SummaryItem label="待支付" value={summary.pendingMinor / 100} />
        </dl>
      )}

      <div className="flex flex-col gap-4 rounded-[22px] border border-white/40 bg-white/35 p-4 shadow-[0_12px_28px_rgba(9,38,59,0.08)] backdrop-blur-xl sm:p-5">
        <div className="grid items-start gap-3 sm:grid-cols-[180px_240px]">
          <div className="grid gap-2">
            <Label className="text-[13px] leading-5 font-medium text-[#24495d]">账单状态</Label>
            <Select
              fullWidth
              aria-label="按账单状态筛选"
              value={status}
              variant="secondary"
              onChange={(value) => {
                setStatus(String(value) as BuyerBillingStatusFilter);
                setPage(1);
              }}
            >
              <Select.Trigger className="h-10 items-center rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 py-0 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)]">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {statusOptions.map((option) => (
                    <ListBox.Item id={option.id} key={option.id} textValue={option.label}>
                      {option.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <TextField
            fullWidth
            aria-label="按订单号筛选账单"
            className="gap-2"
            value={orderNumber}
            variant="secondary"
            onChange={(value) => {
              setOrderNumber(value);
              setPage(1);
            }}
          >
            <Label className="text-[13px] leading-5 font-medium text-[#24495d]">订单号</Label>
            <Input
              autoComplete="off"
              className="h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba]"
              placeholder="搜索订单号"
            />
          </TextField>
        </div>

        <div aria-busy={isLoading} className="min-h-[464px] overflow-hidden">
          {isLoading ? (
            <BillingTableSkeleton />
          ) : error ? (
            <div className="grid min-h-[430px] place-items-center">
              <ErrorState
                description={error}
                isPending={isRetrying}
                onRetry={onRetry}
                title="账单数据暂时不可用"
              />
            </div>
          ) : pageOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] table-fixed border-collapse text-left">
                <caption className="sr-only">买家订单账单列表</caption>
                <colgroup>
                  <col className="w-[150px]" />
                  <col className="w-[210px]" />
                  <col className="w-[190px]" />
                  <col className="w-[140px]" />
                  <col className="w-[130px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">订单时间</th>
                    <th className="px-4" scope="col">订单号</th>
                    <th className="px-4" scope="col">商品</th>
                    <th className="px-4" scope="col">金额</th>
                    <th className="px-4" scope="col">账单状态</th>
                    <th className="rounded-r-[14px] px-4 text-right" scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pageOrders.map((order) => (
                    <tr className="border-b border-[#dce9ee]/75 last:border-0" key={order.id}>
                      <td className="px-4 py-4 text-[12px] leading-5 text-[#78909c]">
                        {formatDateTime(order.created_at)}
                      </td>
                      <th className="px-4 py-4 text-[13px] font-medium text-[#173447]" scope="row">
                        {order.order_no}
                      </th>
                      <td className="px-4 py-4">
                        <p className="truncate text-[13px] font-medium text-[#24495d]">
                          {order.gpu_model?.replace(/^NVIDIA\s+/i, "") || `算力资源 #${order.product_id}`}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8aa0ab]">{order.quantity} 份</p>
                      </td>
                      <td className="px-4 py-4 text-[13px] font-semibold text-[#173447]">
                        {money.format(order.total_amount / 100)}
                      </td>
                      <td className="px-4 py-4">
                        <BillingStatus status={order.status} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button size="sm" variant="ghost" onPress={() => onViewOrder(order.order_no)}>
                          查看订单
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-[430px] place-items-center px-5 text-center">
              <div>
                <h2 className="text-lg font-semibold text-[#173447]">
                  {orders.length ? "没有匹配的账单" : "还没有账单记录"}
                </h2>
                <p className="mt-2 text-sm text-[#78909c]">
                  {orders.length ? "调整账单状态或订单号后再试。" : "订单生成后，相关金额与状态会显示在这里。"}
                </p>
              </div>
            </div>
          )}
        </div>

        {!isLoading && !error && filteredOrders.length > pageSize ? (
          <Pagination aria-label="账单分页" className="w-full flex-wrap justify-between gap-3 border-t border-[#dce9ee]/75 pt-4">
            <Pagination.Summary>
              <AnimatedNumberGroup>
                显示 <AnimatedNumber value={(currentPage - 1) * pageSize + 1} />–<AnimatedNumber value={Math.min(currentPage * pageSize, filteredOrders.length)} />，共 <AnimatedNumber value={filteredOrders.length} /> 条
              </AnimatedNumberGroup>
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous isDisabled={currentPage === 1} onPress={() => setPage(currentPage - 1)}>
                  <Pagination.PreviousIcon />
                  上一页
                </Pagination.Previous>
              </Pagination.Item>
              <Pagination.Item>
                <Pagination.Link isActive>{currentPage}</Pagination.Link>
              </Pagination.Item>
              <Pagination.Item>
                <Pagination.Next isDisabled={currentPage === totalPages} onPress={() => setPage(currentPage + 1)}>
                  下一页
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        ) : null}
      </div>
    </section>
  );
}

function SummaryItem({label, value}: {label: string; value: number}) {
  return (
    <div className="border-b border-[#dce9ee]/75 px-5 py-4 last:border-0 sm:[&:nth-child(n+3)]:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0">
      <dt className="text-xs text-[#78909c]">{label}</dt>
      <dd className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-[#173447]">
        <AnimatedNumber format={currencyFormat} value={value} />
      </dd>
    </div>
  );
}

function BillingStatus({status}: {status: OrderStatus}) {
  const tone = status === "pending_payment"
    ? "bg-[#fff2d9] text-[#a76013]"
    : status === "refunding" || status === "refunded"
      ? "bg-[#ece7ff] text-[#6653a6]"
      : status === "cancelled" || status === "frozen"
        ? "bg-[#e8eef1] text-[#6f828c]"
        : "bg-[#dff5e8] text-[#347759]";

  return (
    <Chip className={tone} size="sm" variant="soft">
      {buyerOrderStatusCopy[status]}
    </Chip>
  );
}

function BillingSummarySkeleton() {
  return (
    <div className="grid overflow-hidden rounded-[20px] border border-white/50 bg-white/50 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({length: 4}, (_, index) => (
        <div className="px-5 py-4" key={index}>
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="mt-3 h-6 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function BillingTableSkeleton() {
  return (
    <div className="space-y-2 pt-2">
      <Skeleton className="h-11 w-full rounded-[14px]" />
      {Array.from({length: 6}, (_, index) => (
        <Skeleton className="h-14 w-full rounded-xl" key={index} />
      ))}
    </div>
  );
}
