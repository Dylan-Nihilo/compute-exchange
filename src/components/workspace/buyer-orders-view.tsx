"use client";

import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  Skeleton,
  Spinner,
  TextField,
} from "@heroui/react";

import {ErrorState} from "@/components/system/operation-state";
import {
  buyerOrderStatusCopy,
  type BuyerOrder,
  type OrderStatus,
} from "@/lib/buyer-orders";
import {formatDate} from "@/lib/format/date";

type StatusFilter = "all" | OrderStatus;

export type BuyerOrderListItem = BuyerOrder & {
  productLabel?: string;
  supplierName?: string;
};

export type BuyerOrdersViewProps = {
  confirmingOrderNo?: string | null;
  error?: string | null;
  isLoading?: boolean;
  isRetrying?: boolean;
  orderNumber: string;
  orders: readonly BuyerOrderListItem[];
  status: StatusFilter;
  onConfirm: (order: BuyerOrderListItem) => void;
  onOrderNumberChange: (value: string) => void;
  onRetry: () => void;
  onStatusChange: (status: StatusFilter) => void;
  onViewDetails: (order: BuyerOrderListItem) => void;
};

const statusOptions = Object.entries(buyerOrderStatusCopy) as [OrderStatus, string][];
const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 0,
  style: "currency",
});

export function BuyerOrdersView({
  confirmingOrderNo = null,
  error = null,
  isLoading = false,
  isRetrying = false,
  orderNumber,
  orders,
  status,
  onConfirm,
  onOrderNumberChange,
  onRetry,
  onStatusChange,
  onViewDetails,
}: BuyerOrdersViewProps) {
  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <h1 className="pb-1 text-[28px] leading-9 font-semibold tracking-[-0.02em] text-[#102b3b] sm:text-[32px]">
          我的订单
        </h1>

        <div className="grid w-full items-start gap-3 sm:grid-cols-[180px_240px] md:w-auto">
          <div className="grid gap-2">
            <Label className="text-[13px] leading-5 font-medium text-[#24495d]">
              订单状态
            </Label>
            <Select
              fullWidth
              aria-label="按订单状态筛选"
              value={status}
              variant="secondary"
              onChange={(value) => onStatusChange(String(value) as StatusFilter)}
            >
              <Select.Trigger className="h-10 items-center rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 py-0 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)]">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue="全部状态">
                    全部状态
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {statusOptions.map(([value, label]) => (
                    <ListBox.Item id={value} key={value} textValue={label}>
                      {label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <TextField
            fullWidth
            aria-label="按订单号筛选"
            className="gap-2"
            value={orderNumber}
            variant="secondary"
            onChange={onOrderNumberChange}
          >
            <Label className="text-[13px] leading-5 font-medium text-[#24495d]">
              订单号
            </Label>
            <Input
              autoComplete="off"
              className="h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba]"
              placeholder="搜索订单号"
            />
          </TextField>
        </div>
      </header>

      <div
        aria-busy={isLoading}
        className="min-h-[576px] overflow-hidden rounded-[22px] border border-white/40 bg-white/35 p-4 shadow-[0_12px_28px_rgba(9,38,59,0.08)] backdrop-blur-xl sm:px-5"
      >
        {isLoading ? (
          <OrdersSkeleton />
        ) : error ? (
          <div className="grid min-h-[520px] place-items-center">
            <ErrorState
              description={error}
              isPending={isRetrying}
              onRetry={onRetry}
              title="订单数据暂时不可用"
            />
          </div>
        ) : orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed border-collapse text-left">
              <caption className="sr-only">买家订单列表</caption>
              <colgroup>
                <col className="w-[190px]" />
                <col className="w-[210px]" />
                <col className="w-[140px]" />
                <col className="w-[130px]" />
                <col className="w-[130px]" />
                <col className="w-[110px]" />
                <col />
              </colgroup>
              <thead>
                <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                  <th className="rounded-l-[14px] px-4" scope="col">订单号</th>
                  <th className="px-4" scope="col">商品</th>
                  <th className="px-4" scope="col">供给方</th>
                  <th className="px-4" scope="col">金额</th>
                  <th className="px-4" scope="col">状态</th>
                  <th className="px-4" scope="col">时间</th>
                  <th className="rounded-r-[14px] px-4 text-right" scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <OrderRow
                    confirmingOrderNo={confirmingOrderNo}
                    key={order.id}
                    order={order}
                    onConfirm={onConfirm}
                    onViewDetails={onViewDetails}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-[520px] place-items-center px-5 text-center">
            <div>
              <h2 className="text-lg font-semibold text-[#173447]">
                {orderNumber || status !== "all" ? "没有匹配的订单" : "还没有算力订单"}
              </h2>
              <p className="mt-2 text-sm text-[#78909c]">
                {orderNumber || status !== "all"
                  ? "调整订单状态或订单号后再试。"
                  : "完成采购后，可在这里跟踪交付与履约状态。"}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function OrderRow({
  confirmingOrderNo,
  order,
  onConfirm,
  onViewDetails,
}: {
  confirmingOrderNo: string | null;
  order: BuyerOrderListItem;
  onConfirm: (order: BuyerOrderListItem) => void;
  onViewDetails: (order: BuyerOrderListItem) => void;
}) {
  const isConfirming = confirmingOrderNo === order.order_no;
  const isAnyConfirmationPending = confirmingOrderNo !== null;

  return (
    <tr className="h-[100px] border-b border-[#b0c9d6]/20 transition-colors hover:bg-white/20 last:border-0">
      <th className="px-4 text-[13px] font-medium text-[#244b61]" scope="row">
        <span className="block truncate" title={`#${order.order_no}`}>
          #{order.order_no}
        </span>
      </th>
      <td className="px-4">
        <span className="block text-[13px] font-medium text-[#244b61]">
          {order.productLabel ?? `算力资源 #${order.product_id}`}
        </span>
      </td>
      <td className="px-4 text-[13px] text-[#5e7786]">
        <span className="block truncate" title={order.supplierName ?? "—"}>
          {order.supplierName ?? "—"}
        </span>
      </td>
      <td className="px-4 text-[13px] font-medium text-[#244b61] tabular-nums">
        {money.format(order.total_amount / 100)}
      </td>
      <td className="px-4">
        <OrderStatusChip status={order.status} />
      </td>
      <td className="px-4 text-[13px] text-[#78909c] tabular-nums">
        {formatDate(order.created_at, {day: "2-digit", month: "2-digit"}, "en-CA").replace("-", "–")}
      </td>
      <td className="px-4">
        <div className="flex justify-end gap-2">
          {order.status === "provisioning" ? (
            <Button
              className="h-9 min-w-[72px] rounded-xl bg-[#d9f72c] px-3 text-xs font-medium text-[#10220c] transition-colors hover:bg-[#cbe923]"
              isDisabled={isAnyConfirmationPending && !isConfirming}
              isPending={isConfirming}
              onPress={() => onConfirm(order)}
            >
              {isConfirming ? (
                <>
                  <Spinner aria-hidden="true" color="current" size="sm" />
                  处理中
                </>
              ) : (
                "确认"
              )}
            </Button>
          ) : (
            <Button
              className="h-9 min-w-16 rounded-xl border-[#afc4ce]/60 bg-white/35 px-3 text-xs text-[#31566a] transition-colors hover:border-[#7e99a8] hover:bg-white/70"
              isDisabled={isAnyConfirmationPending}
              onPress={() => onViewDetails(order)}
              variant="outline"
            >
              详情
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function OrderStatusChip({status}: {status: OrderStatus}) {
  const tone =
    status === "active"
      ? "bg-[#e2f5e7] text-[#2e7d48]"
      : status === "provisioning" || status === "pending_payment"
        ? "bg-[#fff0db] text-[#c56b1b]"
        : status === "completed" || status === "paid"
          ? "bg-[#e3f1fc] text-[#3a72a0]"
          : status === "frozen"
            ? "bg-[#fde8e7] text-[#b94b43]"
            : status === "refunding"
              ? "bg-[#fff6d9] text-[#9b7416]"
              : "bg-[#eef2f4] text-[#6f8794]";

  return (
    <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-medium ${tone}`}>
      {buyerOrderStatusCopy[status]}
    </span>
  );
}

function OrdersSkeleton() {
  return (
    <div aria-label="正在加载订单" role="status">
      <Skeleton className="h-11 rounded-[14px]" />
      {Array.from({length: 5}, (_, index) => (
        <div
          className="grid h-[100px] grid-cols-[190px_210px_140px_130px_130px_110px_1fr] items-center gap-0 border-b border-[#b0c9d6]/20 px-4 last:border-0"
          key={index}
        >
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="ml-auto h-9 w-16 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
