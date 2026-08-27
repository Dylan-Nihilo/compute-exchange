"use client";

import {Button, Modal} from "@heroui/react";

import {buyerOrderStatusCopy} from "@/lib/buyer-orders";
import {formatDateTime} from "@/lib/format/date";
import {
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
  const canDeliver = order.status === "paid" || order.status === "provisioning";

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
              <div className="rounded-xl border border-[#dce9ee] bg-white/55 px-4 py-3">
                <p className="text-sm font-medium text-[#173447]">{productName}</p>
                <p className="mt-0.5 text-xs text-[#78909c]">
                  PRD-#{order.product_id} · {productTypeCopy[order.product_type ?? ""] ?? order.product_type}
                  {" · "}{pricingModeCopy[order.pricing_mode ?? ""] ?? order.pricing_mode}
                </p>
              </div>
              <dl className="grid gap-3 text-xs text-[#78909c] sm:grid-cols-2">
                <Detail label="订单号" value={order.order_no} mono />
                <Detail label="状态" value={buyerOrderStatusCopy[order.status as keyof typeof buyerOrderStatusCopy] ?? order.status} />
                <Detail label="数量" value={`${order.quantity}`} />
                <Detail label="计费周期数" value={`${order.duration}`} />
                <Detail label="总价" value={money.format(order.total_amount / 100)} strong />
                <Detail label="平台费" value={money.format(order.platform_fee / 100)} />
                <Detail label="下单时间" value={formatDateTime(order.created_at)} />
                <Detail label="支付截止" value={order.payment_expires_at ? formatDateTime(order.payment_expires_at) : "—"} />
                <Detail label="租期开始" value={order.lease_start_at ? formatDateTime(order.lease_start_at) : "—"} />
                <Detail label="租期结束" value={order.lease_end_at ? formatDateTime(order.lease_end_at) : "—"} />
              </dl>
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
