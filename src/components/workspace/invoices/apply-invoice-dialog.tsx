"use client";

import {Button, Checkbox, Modal, Skeleton, Spinner} from "@heroui/react";
import {useEffect, useMemo, useState} from "react";

import type {BillableOrder, InvoiceTitle} from "@/lib/buyer-invoices";
import {formatDate} from "@/lib/format/date";

const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

const pricingModeCopy: Record<string, string> = {
  daily: "按天",
  hourly: "按小时",
  monthly: "按月",
  perpetual: "买断",
  weekly: "按周",
};

export function ApplyInvoiceDialog({
  isOrdersLoading = false,
  isPending = false,
  onCancel,
  onEditTitle,
  onRetryOrders,
  onSubmit,
  open,
  orders,
  ordersError = null,
  preselected = null,
  title,
  titleError = null,
}: {
  isOrdersLoading?: boolean;
  isPending?: boolean;
  onCancel: () => void;
  onEditTitle: () => void;
  onRetryOrders: () => void;
  onSubmit: (orderNos: string[]) => void;
  open: boolean;
  orders: readonly BillableOrder[];
  ordersError?: string | null;
  preselected?: string | null;
  title: InvoiceTitle | null;
  titleError?: string | null;
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(preselected ? new Set([preselected]) : new Set());
    }
  }, [open, preselected]);

  const totalFen = useMemo(
    () => orders
      .filter((order) => selected.has(order.order_no))
      .reduce((sum, order) => sum + order.total_amount, 0),
    [orders, selected],
  );

  const toggle = (orderNo: string, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(orderNo);
      else next.delete(orderNo);
      return next;
    });
  };

  const canSubmit = selected.size > 0 && Boolean(title) && !isPending;

  return (
    <Modal.Root isOpen={open} onOpenChange={(isOpen) => { if (!isOpen && !isPending) onCancel(); }}>
      <Modal.Backdrop isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-2xl">
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold text-[#173447]">
                申请开票
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-5">
              {isOrdersLoading ? (
                <div className="space-y-3">
                  {["s1", "s2", "s3"].map((key) => (
                    <Skeleton className="h-14 w-full rounded-xl" key={key} />
                  ))}
                </div>
              ) : ordersError ? (
                <div className="rounded-xl border border-[#dce9ee] bg-white/45 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[#c4392f]" role="alert">
                    可开票订单读取失败
                  </p>
                  <p className="mt-1 text-xs text-[#78909c]">{ordersError}</p>
                  <Button className="mt-4 h-8 min-w-16 px-3 text-xs" onPress={onRetryOrders} variant="outline">
                    重试
                  </Button>
                </div>
              ) : orders.length ? (
                <div>
                  <p className="text-[13px] font-medium text-[#24495d]">选择需要开票的订单</p>
                  <ul className="omnis-scrollbar-y mt-3 max-h-72 space-y-2 pr-1">
                    {orders.map((order) => (
                      <li key={order.order_no}>
                        <Checkbox
                          className="w-full rounded-xl border border-[#dce9ee] bg-white/55 px-4 py-3"
                          isSelected={selected.has(order.order_no)}
                          onChange={(checked) => toggle(order.order_no, checked)}
                        >
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Content className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="truncate text-[13px] font-medium text-[#173447]">
                                {(order.gpu_model || "算力资源").replace(/^NVIDIA\s+/i, "")}
                                <span className="ml-2 text-xs font-normal text-[#78909c]">
                                  {order.quantity} 份 · {pricingModeCopy[order.pricing_mode] ?? "按期"}
                                </span>
                              </span>
                              <span className="text-[13px] font-semibold text-[#173447]">
                                {money.format(order.total_amount / 100)}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-[11px] text-[#8aa0ab]">
                              {order.order_no} · {formatDate(order.created_at)}
                            </span>
                          </Checkbox.Content>
                        </Checkbox>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-[#dce9ee] bg-white/45 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-[#173447]">当前没有可开票订单</p>
                  <p className="mt-1 text-xs text-[#78909c]">
                    已支付且未开票的订单会显示在这里; 退款中、已退款的订单不可开票。
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-[#dce9ee] bg-white/55 px-4 py-3">
                <p className="text-xs text-[#9cb0ba]">开票抬头</p>
                {titleError ? (
                  <p className="mt-1 text-sm text-[#c4392f]" role="alert">
                    开票信息读取失败: {titleError}
                  </p>
                ) : title ? (
                  <p className="mt-1 truncate text-sm font-medium text-[#173447]">
                    {title.company_name} · {title.tax_no}
                  </p>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-[#c4392f]">尚未设置开票信息</p>
                    <Button className="h-8 min-w-28 px-3 text-xs" onPress={onEditTitle} variant="primary">
                      去完善
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-[#dce9ee] pt-4">
                <p className="text-[13px] text-[#78909c]">
                  已选 <span className="font-semibold text-[#173447]">{selected.size}</span> 个订单
                </p>
                <p className="text-sm text-[#78909c]">
                  合计金额{" "}
                  <span className="text-lg font-semibold text-[#173447]">{money.format(totalFen / 100)}</span>
                </p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button isDisabled={isPending} onPress={onCancel} variant="tertiary">
                取消
              </Button>
              <Button
                isDisabled={!canSubmit}
                isPending={isPending}
                onPress={() => onSubmit([...selected])}
                variant="primary"
              >
                {isPending ? (
                  <>
                    <Spinner aria-hidden="true" color="current" size="sm" />
                    正在提交
                  </>
                ) : (
                  "提交申请"
                )}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
