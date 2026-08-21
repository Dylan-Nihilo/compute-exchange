"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, Chip, Skeleton} from "@heroui/react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useMemo, useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {ErrorState} from "@/components/system/operation-state";
import {useCurrentAccount} from "@/lib/auth/queries";
import {
  buyerOrderStatusCopy,
  confirmBuyerOrder,
  fetchBuyerOrders,
  summarizeBuyerOrders,
  type BuyerOrder,
  type OrderStatus,
} from "@/lib/buyer-orders";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";

const ordersKey = ["buyer", "orders"] as const;
const primaryButtonInteraction =
  "transition-[translate,scale,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-[#172733] hover:shadow-[0_12px_20px_rgba(5,20,31,0.28)] active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100";
const secondaryButtonInteraction =
  "transition-[translate,scale,box-shadow,background-color,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#7e99a8] hover:bg-white/65 hover:shadow-[0_8px_16px_rgba(36,74,95,0.12)] active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100";
const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 0,
  style: "currency",
});

export function BuyerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {data: account} = useCurrentAccount();
  const [confirmingOrder, setConfirmingOrder] = useState<BuyerOrder | null>(null);
  const ordersQuery = useQuery({queryKey: ordersKey, queryFn: () => fetchBuyerOrders()});
  const confirmMutation = useMutation({
    mutationFn: (orderId: number) => confirmBuyerOrder(orderId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ordersKey});
      setConfirmingOrder(null);
      notify.success("已确认签收，订单进入履约中");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "确认签收失败"),
  });
  const summary = useMemo(
    () =>
      ordersQuery.data
        ? summarizeBuyerOrders(ordersQuery.data.orders, ordersQuery.data.total)
        : null,
    [ordersQuery.data],
  );

  if (ordersQuery.isPending) return <BuyerDashboardSkeleton />;
  if (ordersQuery.isError || !ordersQuery.data || !summary) {
    return (
      <ErrorState
        description={ordersQuery.error instanceof Error ? ordersQuery.error.message : undefined}
        isPending={ordersQuery.isFetching}
        onRetry={() => void ordersQuery.refetch()}
        title="订单数据暂时不可用"
      />
    );
  }

  const todoCount = summary.pendingPayment + summary.pendingReceipt;

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[#6f8794]">
            买家账户 · {account?.displayName ?? "当前账户"}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] text-[#102b3b]">
              {greeting()}，{shortName(account?.displayName)}
            </h1>
            <Image alt="" aria-hidden="true" className="h-8 w-8" height={32} priority src="/images/buyer-workspace/greeting.png" width={32} />
          </div>
        </div>
        <Button
          className={`h-10 self-start rounded-xl bg-[#0e1b25] px-3.5 text-xs text-white shadow-[0_7px_9px_rgba(5,20,31,0.25)] sm:self-auto ${primaryButtonInteraction}`}
          onPress={() => router.push("/market")}
        >
          <Image alt="" aria-hidden="true" height={18} src="/images/buyer-workspace/store.svg" width={18} />
          前往算力市场
        </Button>
      </header>

      <div className="grid gap-4 xl:grid-cols-[574px_minmax(0,1fr)]">
        <section className="flex min-h-44 flex-col justify-between rounded-[20px] border border-white/35 bg-white/28 p-[18px] shadow-[0_10px_14px_rgba(14,48,69,0.05)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[9px]">
              <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-[#fff0db]/70">
                <Image alt="" aria-hidden="true" height={16} src="/images/buyer-workspace/circle-alert.svg" width={16} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[#173447]">优先处理</h2>
                <p className="text-[11px] text-[#78909c]">影响交易进度的事项</p>
              </div>
            </div>
            <span className="text-xs text-[#6f8794]">共 {todoCount} 项</span>
          </div>

          {todoCount ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <TaskLink
                count={summary.pendingPayment}
                detail="请在有效期内完成支付"
                icon="status-payment.svg"
                label="待支付"
              />
              <TaskLink
                count={summary.pendingReceipt}
                detail="核验资源后确认签收"
                icon="status-delivery.svg"
                label="待确认签收"
              />
            </div>
          ) : (
            <div className="rounded-[14px] bg-white/30 px-4 py-5 text-center text-sm text-[#6f8794]">
              当前没有待处理事项
            </div>
          )}
        </section>

        <section className="grid min-h-44 grid-cols-1 rounded-[20px] border border-white/30 bg-white/25 p-[18px] shadow-[0_10px_12px_rgba(9,38,59,0.09)] backdrop-blur-xl sm:grid-cols-3">
          <Metric
            detail={summary.isTruncated ? "按最近 100 笔统计" : "已支付及履约订单"}
            icon="clock.svg"
            label="进行中订单"
            value={String(summary.inProgress)}
          />
          <Metric
            detail="按已支付订单估算"
            icon="credit-card-small.svg"
            label="本月消费"
            value={money.format(summary.monthSpendMinor / 100)}
          />
          <Metric
            detail="暂无可核验口径"
            icon="trending-down.svg"
            label="累计节省"
            value="—"
          />
        </section>
      </div>

      <section
        className="scroll-mt-24 rounded-[22px] border border-white/30 bg-white/30 px-4 pt-5 pb-3 shadow-[0_10px_12px_rgba(9,38,59,0.09)] backdrop-blur-xl sm:px-5"
        id="recent-orders"
      >
        <div className="flex items-center justify-between pb-3.5">
          <div>
            <h2 className="text-base font-semibold text-[#173447]">近期订单</h2>
            <p className="mt-0.5 text-[11px] text-[#78909c]">查看采购、交付与履约状态</p>
          </div>
          <span className="text-xs text-[#6f8794]">共 {ordersQuery.data.total} 笔</span>
        </div>

        {summary.recentOrders.length ? (
          <div>
            <div className="hidden grid-cols-[minmax(280px,460px)_160px_1fr] rounded-xl bg-[#d6f0fb]/30 px-3.5 py-2 text-[11px] font-medium text-[#9cb0ba] md:grid">
              <span>订单与资源</span>
              <span>状态</span>
              <span className="text-right">操作</span>
            </div>
            {summary.recentOrders.map((order) => (
              <OrderRow key={order.id} onConfirm={() => setConfirmingOrder(order)} order={order} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-52 place-items-center rounded-[18px] bg-white/20 px-6 py-10 text-center">
            <div>
              <h3 className="text-base font-semibold text-[#173447]">还没有算力订单</h3>
              <p className="mt-2 text-sm text-[#6f8794]">选定算力后，可在这里跟踪支付、交付与履约。</p>
              <Button className={`mt-5 ${secondaryButtonInteraction}`} onPress={() => router.push("/market")} variant="outline">
                浏览算力市场
              </Button>
            </div>
          </div>
        )}
      </section>

      <footer className="flex flex-col gap-1 text-[11px] text-[#8aa0ab] sm:flex-row sm:justify-between">
        <span>订单数据已同步 · 金额单位为人民币</span>
        <span>统计来源：买家订单接口</span>
      </footer>

      <ConfirmDialog
        confirmLabel="确认签收"
        description={`确认已核验订单 ${confirmingOrder?.order_no ?? ""} 的资源与访问凭证无误？确认后订单将进入履约中。`}
        isPending={confirmMutation.isPending}
        onCancel={() => setConfirmingOrder(null)}
        onConfirm={() => {
          if (confirmingOrder) confirmMutation.mutate(confirmingOrder.id);
        }}
        open={Boolean(confirmingOrder)}
        title="确认签收资源"
      />
    </section>
  );
}

function BuyerDashboardSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="买家工作台内容"
      className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-5 sm:px-6 lg:px-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-44 rounded-full" />
          <Skeleton className="h-9 w-56 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[574px_minmax(0,1fr)]">
        <Skeleton className="h-44 rounded-[20px]" />
        <Skeleton className="h-44 rounded-[20px]" />
      </div>
      <Skeleton className="h-[284px] rounded-[22px]" />
    </section>
  );
}

function TaskLink({count, detail, icon, label}: {count: number; detail: string; icon: string; label: string}) {
  return (
    <a
      className="group flex items-center gap-2.5 rounded-[14px] bg-white/35 px-3 py-2.5 transition-[translate,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-white/55 hover:shadow-[0_8px_16px_rgba(36,74,95,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#31566a] active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      href="#recent-orders"
    >
      <Image alt="" aria-hidden="true" height={7} src={`/images/buyer-workspace/${icon}`} width={7} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-[#244b61]">{label} {count}</span>
        <span className="block truncate text-[10px] text-[#8aa0ab]">{detail}</span>
      </span>
      <Image alt="" aria-hidden="true" className="transition-[translate] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" height={16} src="/images/buyer-workspace/chevron-right.svg" width={16} />
    </a>
  );
}

function Metric({detail, icon, label, value}: {detail: string; icon: string; label: string; value: string}) {
  return (
    <div className="flex min-h-28 flex-col justify-between border-[#b0c9d6]/20 px-4 py-2 first:border-0 sm:border-l">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-[10px] bg-[#d6f0fb]/45">
          <Image alt="" aria-hidden="true" height={16} src={`/images/buyer-workspace/${icon}`} width={16} />
        </span>
        <span className="text-xs font-medium text-[#5e7786]">{label}</span>
      </div>
      <div>
        <p className="text-[26px] leading-8 font-semibold tracking-[-0.02em] text-[#173447] tabular-nums">{value}</p>
        <p className="mt-1 text-[10px] text-[#8aa0ab]">{detail}</p>
      </div>
    </div>
  );
}

function OrderRow({onConfirm, order}: {onConfirm: () => void; order: BuyerOrder}) {
  return (
    <article className="grid gap-3 border-b border-[#b0c9d6]/15 px-3.5 py-3.5 last:border-0 md:grid-cols-[minmax(280px,460px)_160px_1fr] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[#244b61]">{order.order_no}</p>
        <p className="mt-0.5 truncate text-[11px] text-[#78909c]">
          算力资源 #{order.product_id} · {order.quantity} 份 · {order.duration} 小时 · {formatDateTime(order.created_at)}
        </p>
      </div>
      <div>
        <StatusChip status={order.status} />
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        <Button
          className={`h-9 min-w-16 rounded-xl border-[#afc4ce]/45 px-3 text-xs ${secondaryButtonInteraction}`}
          onPress={() => window.location.assign(`/market/${order.product_id}`)}
          variant="outline"
        >
          资源
        </Button>
        {order.status === "provisioning" ? (
          <Button className={`h-9 rounded-xl px-4 text-xs ${primaryButtonInteraction}`} onPress={onConfirm} variant="primary">
            确认签收
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function StatusChip({status}: {status: OrderStatus}) {
  const color = status === "completed" || status === "active"
    ? "success"
    : status === "pending_payment" || status === "provisioning" || status === "paid"
      ? "warning"
      : status === "frozen" || status === "refunded"
        ? "danger"
        : "default";
  return <Chip color={color} size="sm" variant="soft">{buyerOrderStatusCopy[status]}</Chip>;
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date()));
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function shortName(displayName?: string) {
  if (!displayName) return "你好";
  return displayName.length > 8 ? displayName.slice(-4) : displayName;
}
