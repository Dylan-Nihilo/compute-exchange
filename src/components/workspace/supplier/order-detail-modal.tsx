"use client";

import {ScheduleAdvice} from "@/components/scheduler/schedule-advice";

import {Button, Modal} from "@heroui/react";

import {buyerOrderStatusCopy} from "@/lib/buyer-orders";
import {formatDateTime} from "@/lib/format/date";
import {nightlyOrderSummary} from "@/lib/nightly";
import {
  isManagedOrder,
  managedSettleCopy,
  pricingModeCopy,
  productTypeCopy,
  type SupplierOrder,
} from "@/lib/supplier-workspace";

const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

// 履约订单详情弹窗: 订单与产品摘要; 可交付状态提供「回填交付凭证」入口。
export function OrderDetailModal({
  onClose,
  onDeliver,
  open,
  order,
}: {
  onClose: () => void;
  onDeliver: (order: SupplierOrder) => void;
  open: boolean;
  order: SupplierOrder | null;
}) {
  if (!order) return null;
  const productName = (order.gpu_model || "算力资源").replace(/^NVIDIA\s+/i, "");
  // Managed orders are provisioned by the platform; there is no manual deliver step (docs/25 §25.2).
  const managed = isManagedOrder(order);
  const nightly = nightlyOrderSummary(order);
  const canDeliver = !managed && (order.status === "paid" || order.status === "provisioning");

  return (
    <Modal.Root isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-xl">
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold text-[#173447]">
                订单详情
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
              {open && order && !managed ? <ScheduleAdvice key={order.order_no} orderNo={order.order_no} role="supplier" /> : null}
              <div className="rounded-xl border border-[#dce9ee] bg-white/55 px-4 py-3">
                <p className="text-sm font-medium text-[#173447]">{productName}</p>
                <p className="mt-0.5 text-xs text-[#78909c]">
                  PRD-#{order.product_id} · {productTypeCopy[order.product_type ?? ""] ?? order.product_type}
                  {" · "}{pricingModeCopy[order.pricing_mode ?? ""] ?? order.pricing_mode}
                  {managed ? " · 平台托管" : ""}
                </p>
                {nightly ? <p className="mt-1 text-xs text-[#24495d]">{nightly}</p> : null}
              </div>
              <dl className="grid gap-3 text-xs text-[#78909c] sm:grid-cols-2">
                <Detail label="订单号" value={order.order_no} mono />
                <Detail label="状态" value={buyerOrderStatusCopy[order.status as keyof typeof buyerOrderStatusCopy] ?? order.status} />
                <Detail label="数量" value={`${order.quantity}`} />
                <Detail label={nightly ? "包夜晚数" : order.current_lease ? "原购买周期数" : "计费周期数"} value={nightly ? `${order.duration} 晚` : `${order.duration}`} />
                <Detail label={order.current_lease ? "原订单金额" : "总价"} value={money.format(order.total_amount / 100)} strong />
                <Detail label="平台费" value={money.format(order.platform_fee / 100)} />
                <Detail label="下单时间" value={formatDateTime(order.created_at)} />
                <Detail label="支付截止" value={order.payment_expires_at ? formatDateTime(order.payment_expires_at) : "—"} />
                <Detail label="租期开始" value={order.lease_start_at ? formatDateTime(order.lease_start_at) : "—"} />
                <Detail label="租期结束" value={order.lease_end_at ? formatDateTime(order.lease_end_at) : "—"} />
              </dl>
              {order.current_lease ? <dl className="grid gap-3 text-xs text-muted sm:grid-cols-2">
                <Detail label="本次续租订单" value={order.current_lease.order_no} mono />
                <Detail label="本次交付周期" value={`${order.current_lease.duration} ${order.current_lease.pricing_mode === "nightly" ? "晚" : "个周期"} · ${pricingModeCopy[order.current_lease.pricing_mode] ?? order.current_lease.pricing_mode}`} />
              </dl> : null}
              {managed ? <ManagedOrderNote order={order} /> : null}
              {canDeliver ? (
                <p className="rounded-xl border border-[#c3e2f5]/60 bg-[#e8f6fe]/60 px-4 py-2.5 text-xs leading-5 text-[#1d63ae]">
                  该订单等待交付: 请在自有控制台开通资源后, 回填实例访问凭证。
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button onPress={onClose} variant="tertiary">
                关闭
              </Button>
              {canDeliver ? (
                <Button onPress={() => onDeliver(order)} variant="primary">
                  回填交付凭证
                </Button>
              ) : null}
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function ManagedOrderNote({order}: {order: SupplierOrder}) {
  const provisioning = order.status === "paid" || order.status === "provisioning";
  return (
    <div className="rounded-xl border border-[#c3e2f5]/60 bg-[#e8f6fe]/60 px-4 py-2.5 text-xs leading-5 text-[#1d63ae]">
      <p>
        {provisioning
          ? "平台托管订单：平台正在自动分配卡槽并开通，无需你回填凭证。"
          : "平台托管订单：由平台开通、回收，买家经平台网关登录。"}
      </p>
      <p className="mt-1">
        {managedSettleCopy(order, formatDateTime)}
      </p>
    </div>
  );
}

function Detail({label, mono = false, strong = false, value}: {label: string; mono?: boolean; strong?: boolean; value: string}) {
  return (
    <div className="min-w-0">
      <dt>{label}</dt>
      <dd className={`mt-1 truncate ${strong ? "text-sm font-semibold text-[#173447]" : "text-[#24495d]"} ${mono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
