"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";

import {fetchBuyerOrderRenewalQuote, isManagedBuyerOrder, renewBuyerOrder, type BuyerOrderDetail, type BuyerOrderRenewalQuote} from "@/lib/buyer-orders";
import {managedAccessKey} from "@/components/workspace/buyer/managed/managed-access-card";
import {formatDateTime} from "@/lib/format/date";
import {fetchManagedAccess, isBareMetalLease} from "@/lib/managed-orders";
import {legalHref} from "@/lib/legal";

const units = {hourly: "小时", daily: "天", weekly: "周", monthly: "个月", nightly: "晚"};
const money = (fen: number) => new Intl.NumberFormat("zh-CN", {style: "currency", currency: "CNY"}).format(fen / 100);

export function OrderRenewal({detail}: {detail: BuyerOrderDetail}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState(String(detail.product.min_duration ?? 1));
  const amount = Number(duration);
  const managed = isManagedBuyerOrder(detail);
  // Shares the access card's query/cache entry; delivery_kind wins, product.delivery_mode is the fallback.
  const access = useQuery({
    queryKey: managedAccessKey(detail.order.order_no),
    queryFn: () => fetchManagedAccess(detail.order.order_no),
    enabled: managed,
    retry: false,
  });
  const bareMetal = managed && isBareMetalLease(access.data, detail.product.delivery_mode);
  // Renewal is priced by the order's own pricing-mode snapshot (docs/26 §26.9); older orders fall back to the product.
  const pricingMode = detail.order.pricing_mode ?? detail.product.pricing_mode;
  const quote = useQuery({
    queryKey: ["buyer", "renewal-quote", detail.order.order_no, amount],
    queryFn: () => fetchBuyerOrderRenewalQuote(detail.order.order_no, amount),
    enabled: open && detail.actions.can_renew && Number.isSafeInteger(amount) && amount > 0,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (detail.pending_renewal_order_no) return (
    <section className="mt-4 rounded-xl border border-border bg-surface p-5 text-sm">
      <p>已有待支付的续租订单。支付确认后更新租期。</p>
      <Link className="mt-2 inline-block font-medium underline underline-offset-4" href={`/console/buyer/orders/${detail.pending_renewal_order_no}`}>继续处理续租订单</Link>
    </section>
  );

  if (!detail.actions.can_renew) return null;
  return (
    <section className="mt-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-foreground">续租资源</h2>
        <Button variant="outline" onPress={() => setOpen(!open)}>{open ? "收起续租" : "办理续租"}</Button>
      </div>
      {open ? <div className="mt-4 space-y-4">
        <label className="flex flex-wrap items-center gap-3 text-sm">
          续租时长
          <input aria-label="续租时长" className="w-28 rounded-lg border border-border bg-field px-3 py-2 text-foreground" type="number" step="1"
            min={detail.product.min_duration ?? 1} max={quote.data?.max_duration} value={duration} onChange={(event) => setDuration(event.target.value)} />
          <span>{units[pricingMode as keyof typeof units] ?? "个周期"}</span>
        </label>
        {!Number.isSafeInteger(amount) || amount < 1 ? <p role="alert" className="text-sm text-danger">请输入有效的续租时长。</p> : null}
        {quote.isFetching ? <p className="text-sm text-muted" role="status">正在获取续租报价…</p> : null}
        {quote.isError ? <div role="alert" className="text-sm text-danger">{quote.error.message} <Button size="sm" variant="tertiary" onPress={() => void quote.refetch()}>刷新报价</Button></div> : null}
        {quote.data && !quote.isFetching && !quote.isError && Number.isSafeInteger(amount) && amount > 0 ?
          <AcceptedRenewalQuote bareMetal={bareMetal} key={JSON.stringify(quote.data)} managed={managed} quote={quote.data} /> : null}
      </div> : null}
    </section>
  );
}

function AcceptedRenewalQuote({managed, bareMetal, quote}: {managed: boolean; bareMetal: boolean; quote: BuyerOrderRenewalQuote}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const [requestID] = useState(() => crypto.randomUUID());
  const create = useMutation({
    mutationFn: () => renewBuyerOrder(quote, requestID, agreed),
    onSuccess: async ({order_no}) => {
      await queryClient.invalidateQueries({queryKey: ["buyer", "orders"]});
      router.push(`/console/buyer/orders/${order_no}`);
    },
    onError: () => { void queryClient.invalidateQueries({queryKey: ["buyer", "orders"]}); },
  });
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2">
        <dt className="text-muted">原订单</dt><dd className="break-all">{quote.parent_order_no}</dd>
        <dt className="text-muted">续租周期</dt><dd>{quote.duration} {units[quote.pricing_mode]} · 数量 {quote.quantity}</dd>
        <dt className="text-muted">当前到期时间</dt><dd>{formatDateTime(quote.lease_end_at)}</dd>
        <dt className="text-muted">续租后到期</dt><dd>{quote.renewed_until ? formatDateTime(quote.renewed_until) : managed ? "平台重新开通、自检通过后计算" : "重新交付并确认签收后计算"}</dd>
        <dt className="text-muted">本次单价</dt><dd>{money(quote.unit_price)} / {units[quote.pricing_mode]}</dd>
        <dt className="text-muted">应付金额</dt><dd className="font-semibold">{money(quote.total_amount)}</dd>
        <dt className="text-muted">含平台服务费</dt><dd>{money(quote.platform_fee)}</dd>
      </dl>
      <p className="text-muted">{renewalHint(quote.mode, managed, bareMetal)}</p>
      <label className="flex items-start gap-2">
        <input className="mt-0.5 size-4 shrink-0 accent-accent" type="checkbox" checked={agreed} disabled={create.isPending} onChange={(event) => setAgreed(event.target.checked)} />
        <span>我已阅读并同意 <Link className="underline underline-offset-4" href={legalHref("resource-usage-rules")} target="_blank" rel="noopener noreferrer">《算力资源使用规范》</Link>，确认本次续租费用与周期。</span>
      </label>
      <Button isDisabled={!agreed} isPending={create.isPending} onPress={() => create.mutate()}>确认续租并生成订单</Button>
      {create.isError ? <div role="alert" className="text-danger">{create.error.message}
        <Button size="sm" variant="tertiary" onPress={() => void queryClient.invalidateQueries({queryKey: ["buyer", "renewal-quote", quote.parent_order_no]})}>刷新续租报价</Button>
      </div> : null}
    </div>
  );
}

export function renewalHint(mode: BuyerOrderRenewalQuote["mode"], managed: boolean, bareMetal = false) {
  // T-089: bare-metal leases have no grace period — extend only before expiry, restart only after purge.
  if (bareMetal) {
    return mode === "extend"
      ? "支付确认后网关放行时间随租期自动延长，宿主机账户与数据不变。请务必在当前租期结束前完成支付，到期即清除整机数据。"
      : "原租期已结束，整机数据已清除。支付后平台重新分配整机并开通，原数据无法恢复。";
  }
  if (mode === "extend") {
    return managed
      ? "支付确认后网关放行时间随租期自动延长，登录名与连接方式不变。请在当前租期结束前完成支付。"
      : "支付确认后延长当前租期，原访问凭证继续使用。请在当前租期结束前完成支付。";
  }
  return managed
    ? "原租期已结束。支付后平台自动重新开通：宽限期内在原节点恢复原环境与数据；宽限期后重新分配资源，原数据已清除。"
    : "原租期已结束，需重新预留资源。支付后由供给方重新交付，并生成新的访问凭证。";
}
