"use client";

import {useMutation, useQuery} from "@tanstack/react-query";
import {Button, Skeleton, Spinner} from "@heroui/react";
import Image from "next/image";
import {useParams, useRouter} from "next/navigation";
import {useState, type ReactNode} from "react";

import {ErrorState} from "@/components/system/operation-state";
import {
  buyerOrderStatusCopy,
  fetchBuyerOrderCredential,
  fetchBuyerOrderDetail,
  isBuyerOrderNo,
  revealBuyerOrderCredential,
  type BuyerOrderAccessCredential,
  type BuyerOrderDetail,
} from "@/lib/buyer-orders";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";

const assetBase = "/images/buyer-workspace/order-detail";
const cardClass = "rounded-[20px] border border-[#afc4ce]/20 bg-white/60 shadow-[0_10px_28px_-18px_rgba(14,48,69,0.12)] backdrop-blur-xl";
const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 2,
  style: "currency",
});
const shortDate = new Intl.DateTimeFormat("zh-CN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Shanghai",
  year: "numeric",
});

const pricingModeCopy: Record<string, string> = {
  daily: "按天",
  hourly: "按小时",
  monthly: "按月",
  perpetual: "买断",
  weekly: "按周",
};

export default function BuyerOrderDetailPage() {
  const router = useRouter();
  const {orderId} = useParams<{orderId: string}>();
  const validOrderNo = isBuyerOrderNo(orderId);
  const orderQuery = useQuery({
    enabled: validOrderNo,
    queryKey: ["buyer", "orders", "detail", orderId],
    queryFn: () => fetchBuyerOrderDetail(orderId),
  });

  if (orderQuery.isPending && validOrderNo) return <DetailSkeleton />;

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

  if (!validOrderNo || !orderQuery.data) {
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
    <OrderDetail
      detail={orderQuery.data}
      key={orderQuery.data.order.order_no}
      onBack={() => router.push("/console/buyer/orders")}
    />
  );
}

function OrderDetail({detail, onBack}: {detail: BuyerOrderDetail; onBack: () => void}) {
  const router = useRouter();
  const {delivery, order, product, supplier} = detail;
  const supplierName = supplier.name || (supplier.self_operated ? "平台自营" : "—");
  const productName = product.gpu_model || productTypeCopy(product.product_type);
  const statusCopy = buyerOrderStatusCopy[order.status];
  const progress = orderProgress(detail);

  return (
    <section className="mx-auto w-full max-w-[1228px] px-4 pt-8 pb-10 sm:px-6 xl:px-8">
      <header className="flex min-h-12 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Button className="h-9 min-w-16 px-4 text-sm" onPress={onBack} variant="outline">
            返回
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-6 text-[#173447]">订单详情</h1>
            <p className="mt-1 truncate text-xs text-[#7b929e]">#{order.order_no} · {statusCopy}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <ActionButton label="申请发票" onPress={() => router.push(`/console/buyer/invoices?apply=${order.order_no}`)} />
          <ActionButton label="发起工单" />
          <ActionButton label="申请退款" disabled={!detail.actions.can_refund} />
        </div>
      </header>

      <section className={`${cardClass} mt-5 grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1.65fr)_repeat(3,minmax(110px,1fr))] sm:items-center sm:px-6`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone(order.status)}`}>{statusCopy}</span>
            <h2 className="truncate text-lg font-semibold text-[#173447]">{statusHeadline(order.status)}</h2>
          </div>
          <p className="mt-2 text-xs text-[#7b929e]">{statusDescription(detail)}</p>
        </div>
        <SummaryMetric label="租赁周期" value={leasePeriod(detail)} />
        <SummaryMetric label="实付金额" value={money.format(order.total_amount / 100)} />
        <SummaryMetric label="供给方" value={supplierName} />
      </section>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,744px)_minmax(320px,404px)]">
        <div className="space-y-4">
          <InfoCard icon="receipt.svg" title="订单信息">
            <InfoItem label="订单编号" value={order.order_no} />
            <InfoItem label="下单时间" value={formatDateTime(order.created_at)} />
            <InfoItem label="商品" value={`${productName} · ${order.quantity}${quantityUnit(product.product_type)} · ${pricingModeCopy[product.pricing_mode] || "按期"}`} />
            <InfoItem label="实付金额" value={money.format(order.total_amount / 100)} />
            <InfoItem label="供给方" value={supplierName} />
            <InfoItem label="履约率" value={supplier.credit ? `${supplier.credit.fulfill_rate}%` : "暂无评分"} />
          </InfoCard>

          <InfoCard icon="server.svg" title="交付信息">
            <InfoItem label="访问状态" value={delivery ? accessStatusCopy(delivery.access_status) : "尚未生成"} />
            <InfoItem label="买家确认" value={delivery?.confirmed_by_buyer ? "已确认" : "待确认"} />
            <InfoItem label="确认时间" value={dateOrDash(delivery?.buyer_confirmed_at)} />
            <InfoItem label="凭证有效期" value={dateOrDash(delivery?.access_expires_at)} />
          </InfoCard>

          <AccessCredentialCard detail={detail} />
        </div>

        <section className={`${cardClass} min-h-[520px] p-5 lg:min-h-[724px]`}>
          <CardTitle icon="blocks.svg" title="订单进度" />
          <span className={`mt-5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone(order.status)}`}>{statusCopy}</span>
          <ol className="mt-8">
            {progress.map((item, index) => (
              <li className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-3 pb-10 last:pb-0" key={`${item.title}-${item.at}`}>
                {index < progress.length - 1 ? <span aria-hidden="true" className="absolute top-5 bottom-0 left-[9px] w-px bg-[#d9e5e9]" /> : null}
                <span aria-hidden="true" className={`relative z-10 mt-1 block size-5 rounded-full border-[5px] ${index === progress.length - 1 ? "border-[#173447] bg-white" : "border-[#b7cf58] bg-white"}`} />
                <div className="min-w-0">
                  <time className="text-xs text-[#7b929e]">{formatDateTime(item.at)}</time>
                  <h3 className="mt-2 text-sm font-semibold text-[#244b61]">{item.title}</h3>
                  <p className="mt-1 break-words text-xs leading-5 text-[#7b929e]">{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}

function AccessCredentialCard({detail}: {detail: BuyerOrderDetail}) {
  const {order} = detail;
  const [revealed, setRevealed] = useState<BuyerOrderAccessCredential | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const credentialQuery = useQuery({
    enabled: detail.actions.can_view_credential,
    queryKey: ["buyer", "orders", "credential", order.order_no],
    queryFn: () => fetchBuyerOrderCredential(order.order_no),
  });
  const revealMutation = useMutation({
    mutationFn: () => revealBuyerOrderCredential(order.order_no),
    onSuccess: (credential) => {
      setRevealed(credential);
      setShowSecret(true);
      notify.success("访问凭证已显示");
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : "凭证读取失败"),
  });
  const maskedCredential = credentialQuery.data;
  const credential = revealed ?? maskedCredential;
  const visibleValue = showSecret ? revealed?.access_value : maskedCredential?.access_value;

  return (
    <section className={`${cardClass} min-h-[376px] p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle icon="key.svg" title="访问凭证" />
        <span className="rounded-full bg-[#edf4dc] px-2.5 py-1 text-[11px] font-medium text-[#718827]">
          {detail.delivery ? accessStatusCopy(detail.delivery.access_status) : "尚未生成"}
        </span>
      </div>

      <div className="mt-5 flex items-center overflow-x-auto pb-1 text-[11px] text-[#597481]">
        {credentialSteps(detail).map((step, index, steps) => (
          <div className="flex shrink-0 items-center" key={step.label}>
            <span className={`rounded-full px-3 py-1.5 ${step.done ? "bg-[#edf4dc] text-[#718827]" : "bg-[#edf3f5] text-[#8aa0aa]"}`}>{step.label}</span>
            {index < steps.length - 1 ? <Image alt="" aria-hidden="true" className="mx-2" height={8} src={`${assetBase}/chevron-right.svg`} width={5} /> : null}
          </div>
        ))}
      </div>

      {credentialQuery.isPending && detail.actions.can_view_credential ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      ) : credentialQuery.isError ? (
        <div className="mt-6 rounded-xl bg-[#f4f7f8] px-4 py-5 text-sm text-[#607985]">
          <p>{credentialQuery.error instanceof Error ? credentialQuery.error.message : "访问凭证读取失败"}</p>
          <Button className="mt-3" onPress={() => void credentialQuery.refetch()} size="sm" variant="outline">重新尝试</Button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <CredentialField
            label="Access Key"
            onCopy={credential?.access_key ? () => copyText(credential.access_key) : undefined}
            value={credential?.access_key || "尚未生成"}
          />
          <CredentialField
            label="Access Value"
            onCopy={showSecret && visibleValue ? () => copyText(visibleValue) : undefined}
            value={visibleValue || (credential ? "••••••••••••••••" : "尚未生成")}
          />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#8aa0aa]">有效期至 {dateOrDash(credential?.access_expires_at ?? detail.delivery?.access_expires_at)}</p>
        {credential ? (
          <Button
            className="h-8 min-w-20 px-3 text-xs"
            isDisabled={revealMutation.isPending}
            isPending={revealMutation.isPending}
            onPress={() => {
              if (revealed) setShowSecret((value) => !value);
              else revealMutation.mutate();
            }}
            variant="outline"
          >
            {revealMutation.isPending ? <Spinner aria-hidden="true" color="current" size="sm" /> : null}
            {revealed ? (showSecret ? "隐藏明文" : "显示明文") : "查看明文"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function InfoCard({children, icon, title}: {children: ReactNode; icon: string; title: string}) {
  return (
    <section className={`${cardClass} p-5`}>
      <CardTitle icon={icon} title={title} />
      <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

function CardTitle({icon, title}: {icon: string; title: string}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-[#edf3f5]">
        <Image alt="" aria-hidden="true" height={18} src={`${assetBase}/${icon}`} width={18} />
      </span>
      <h2 className="text-base font-semibold text-[#244b61]">{title}</h2>
    </div>
  );
}

function InfoItem({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[#8aa0aa]">{label}</dt>
      <dd className="mt-1.5 break-words text-[13px] font-medium leading-5 text-[#385e70]">{value}</dd>
    </div>
  );
}

function SummaryMetric({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0 border-l border-[#dce7eb] pl-5 first:border-0 first:pl-0 max-sm:border-0 max-sm:pl-0">
      <p className="text-xs text-[#8aa0aa]">{label}</p>
      <p className="mt-2 truncate text-[13px] font-semibold text-[#385e70]" title={value}>{value}</p>
    </div>
  );
}

function CredentialField({label, onCopy, value}: {label: string; onCopy?: () => void; value: string}) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-xl border border-[#dfe9ed] bg-white/55 px-4">
      <span className="w-24 shrink-0 text-xs text-[#8aa0aa]">{label}</span>
      <code className="min-w-0 flex-1 truncate text-xs text-[#385e70]">{value}</code>
      {onCopy ? <Button className="h-7 min-w-12 px-2 text-xs" onPress={onCopy} variant="tertiary">复制</Button> : null}
    </div>
  );
}

function ActionButton({disabled = false, label, onPress}: {disabled?: boolean; label: string; onPress?: () => void}) {
  return (
    <Button
      className="h-9 min-w-20 px-4 text-xs"
      isDisabled={disabled}
      onPress={onPress ?? (() => notify.info(`${label}暂未开放`))}
      variant="outline"
    >
      {label}
    </Button>
  );
}

function DetailSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1228px] space-y-5 px-4 pt-8 sm:px-6 xl:px-8">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-9 w-64 rounded-xl" />
      </div>
      <Skeleton className="h-[108px] rounded-[20px]" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,744px)_minmax(320px,404px)]">
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-[20px]" />
          <Skeleton className="h-32 rounded-[20px]" />
          <Skeleton className="h-[376px] rounded-[20px]" />
        </div>
        <Skeleton className="h-[724px] rounded-[20px]" />
      </div>
    </section>
  );
}

function orderProgress(detail: BuyerOrderDetail) {
  const items = [{at: detail.order.created_at, description: `#${detail.order.order_no}`, title: "订单创建"}];
  if (detail.delivery) {
    items.push({
      at: detail.delivery.created_at,
      description: accessStatusCopy(detail.delivery.access_status),
      title: detail.delivery.access_status === "none" ? "开始交付" : "访问凭证已生成",
    });
  }
  if (detail.delivery?.buyer_confirmed_at) {
    items.push({at: detail.delivery.buyer_confirmed_at, description: "资源与访问凭证已确认", title: "买家确认签收"});
  }
  if (detail.order.updated_at !== detail.order.created_at) {
    items.push({at: detail.order.updated_at, description: statusDescription(detail), title: buyerOrderStatusCopy[detail.order.status]});
  }
  return items;
}

function credentialSteps(detail: BuyerOrderDetail) {
  const accessStatus = detail.delivery?.access_status;
  return [
    {done: Boolean(detail.delivery), label: "供给方交付"},
    {done: accessStatus === "generated" || accessStatus === "delivered", label: "生成凭证"},
    {done: Boolean(detail.delivery?.confirmed_by_buyer), label: "买家确认"},
    {done: detail.order.status === "active" || detail.order.status === "completed", label: "履约访问"},
  ];
}

function statusHeadline(status: BuyerOrderDetail["order"]["status"]) {
  return {
    active: "算力已开通",
    cancelled: "订单已取消",
    completed: "履约已完成",
    frozen: "订单已冻结",
    paid: "订单已支付",
    pending_payment: "等待完成支付",
    provisioning: "等待确认签收",
    refunded: "退款已完成",
    refunding: "退款处理中",
  }[status];
}

function statusDescription(detail: BuyerOrderDetail) {
  const {order} = detail;
  if (order.status === "active" && order.lease_end_at) return `履约至 ${shortDate.format(new Date(order.lease_end_at))}`;
  if (order.status === "pending_payment" && order.payment_expires_at) return `请在 ${formatDateTime(order.payment_expires_at)} 前完成支付`;
  return {
    active: "算力资源已开通，当前正在履约",
    cancelled: "该订单已取消",
    completed: "本次算力服务已经完成",
    frozen: "履约已暂停，请查看工单通知",
    paid: "供给方正在准备交付资源",
    pending_payment: "支付完成后将进入资源交付",
    provisioning: "请核验资源与访问凭证后确认签收",
    refunded: "本次退款已经完成",
    refunding: "退款申请正在处理中",
  }[order.status] ?? "订单状态已更新";
}

function statusTone(status: BuyerOrderDetail["order"]["status"]) {
  if (status === "active" || status === "completed") return "bg-[#edf4dc] text-[#718827]";
  if (status === "refunded" || status === "cancelled") return "bg-[#edf1f3] text-[#78909c]";
  if (status === "frozen") return "bg-[#fee9e6] text-[#ad574f]";
  if (status === "paid" || status === "provisioning" || status === "pending_payment") return "bg-[#fff0df] text-[#a86c2c]";
  return "bg-[#e5f0f8] text-[#41759a]";
}

function leasePeriod(detail: BuyerOrderDetail) {
  const {lease_end_at, lease_start_at} = detail.order;
  if (lease_start_at && lease_end_at) return `${shortDate.format(new Date(lease_start_at))} — ${shortDate.format(new Date(lease_end_at))}`;
  return `${detail.order.duration} ${durationUnit(detail.product.pricing_mode)}`;
}

function copyText(value: string) {
  navigator.clipboard.writeText(value)
    .then(() => notify.success("已复制"))
    .catch(() => notify.error("复制失败，请手动复制"));
}

function dateOrDash(value?: string | null) {
  return value ? formatDateTime(value) : "—";
}

function productTypeCopy(value: string) {
  return {card_rental: "GPU 卡租赁", center: "算力中心", colocation: "机房托管", outright: "整机买断"}[value] ?? value;
}

function quantityUnit(productType: string) {
  return productType === "colocation" ? "机柜" : productType === "card_rental" ? "卡" : "台";
}

function durationUnit(pricingMode: string) {
  return {daily: "天", hourly: "小时", monthly: "个月", perpetual: "次", weekly: "周"}[pricingMode] ?? "期";
}

function accessStatusCopy(status: string) {
  return {delivered: "已交付", generated: "已生成", none: "尚未生成", revoked: "已吊销"}[status] ?? status;
}
