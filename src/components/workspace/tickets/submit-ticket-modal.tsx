"use client";

import {
  Button,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import {useEffect, useMemo, useState} from "react";

import {ticketTitleFromContent, ticketTypeCopy, type CreateTicketInput} from "@/lib/buyer-tickets";
import type {BuyerOrder} from "@/lib/buyer-orders";

const fieldClass =
  "h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba]";
const fieldErrorClass =
  "h-10 rounded-xl border border-[#e5484d]/60 bg-[#fff7f7] px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba]";
const areaClass =
  "rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 py-2.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";
const areaErrorClass =
  "rounded-xl border border-[#e5484d]/60 bg-[#fff7f7] px-3.5 py-2.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";

const typeOptions = Object.entries(ticketTypeCopy) as [string, string][];

type FieldKey = "orderNo" | "content";

export function SubmitTicketModal({
  isOrdersLoading = false,
  isPending = false,
  onCancel,
  onSubmit,
  open,
  orders,
  preselectedOrderNo = null,
}: {
  isOrdersLoading?: boolean;
  isPending?: boolean;
  onCancel: () => void;
  onSubmit: (input: CreateTicketInput) => void;
  open: boolean;
  orders: readonly BuyerOrder[];
  preselectedOrderNo?: string | null;
}) {
  const [orderNo, setOrderNo] = useState("");
  const [type, setType] = useState("resource_fault");
  const [content, setContent] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

  useEffect(() => {
    if (open) {
      setOrderNo(preselectedOrderNo ?? "");
      setType("resource_fault");
      setContent("");
      setErrors({});
      setTouched({});
    }
  }, [open, preselectedOrderNo]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.order_no === orderNo) ?? null,
    [orderNo, orders],
  );

  const validate = (key: FieldKey) => {
    const value = (key === "orderNo" ? orderNo : content).trim();
    if (key === "orderNo") return value ? null : "请选择关联订单";
    return value.length >= 5 ? null : "请填写问题描述(至少 5 个字)";
  };

  const blurField = (key: FieldKey) => {
    setTouched((current) => ({...current, [key]: true}));
    setErrors((current) => ({...current, [key]: validate(key) ?? undefined}));
  };

  const changeValue = (key: FieldKey, value: string) => {
    if (key === "orderNo") setOrderNo(value);
    else setContent(value);
    setErrors((current) => (current[key] ? {...current, [key]: undefined} : current));
  };

  const submit = () => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    for (const key of ["orderNo", "content"] as FieldKey[]) {
      const error = validate(key);
      if (error) nextErrors[key] = error;
    }
    setErrors(nextErrors);
    setTouched({orderNo: true, content: true});
    if (Object.values(nextErrors).some(Boolean)) return;
    onSubmit({
      order_no: orderNo,
      type,
      title: ticketTitleFromContent(content),
      content: content.trim(),
    });
  };

  const fieldError = (key: FieldKey) => (touched[key] ? errors[key] : undefined);

  return (
    <Modal.Root isOpen={open} onOpenChange={(isOpen) => { if (!isOpen && !isPending) onCancel(); }}>
      <Modal.Backdrop isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-xl">
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold text-[#173447]">
                提交工单
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium text-[#24495d]">关联订单</Label>
                <Select
                  aria-label="选择关联订单"
                  isDisabled={isOrdersLoading}
                  value={orderNo}
                  variant="secondary"
                  onChange={(value) => changeValue("orderNo", String(value))}
                >
                  <Select.Trigger className={fieldError("orderNo") ? fieldErrorClass : fieldClass}>
                    <Select.Value>
                      {isOrdersLoading ? "正在读取订单…" : "请选择关联订单"}
                    </Select.Value>
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {orders.map((order) => (
                        <ListBox.Item id={order.order_no} key={order.order_no} textValue={order.order_no}>
                          {order.order_no} · {(order.gpu_model || "算力资源").replace(/^NVIDIA\s+/i, "")}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {fieldError("orderNo") ? (
                  <p className="text-xs text-[#c4392f]" role="alert">{fieldError("orderNo")}</p>
                ) : selectedOrder ? (
                  <p className="text-xs text-[#78909c]">
                    {(selectedOrder.gpu_model || "算力资源").replace(/^NVIDIA\s+/i, "")} · 金额 ¥{(selectedOrder.total_amount / 100).toFixed(2)}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium text-[#24495d]">问题类型</Label>
                <Select
                  aria-label="选择问题类型"
                  value={type}
                  variant="secondary"
                  onChange={(value) => setType(String(value))}
                >
                  <Select.Trigger className={fieldClass}>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {typeOptions.map(([id, label]) => (
                        <ListBox.Item id={id} key={id} textValue={label}>
                          {label}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <TextField fullWidth className="gap-1.5" value={content} variant="secondary" onChange={(value) => changeValue("content", value)}>
                  <Label className="text-[13px] font-medium text-[#24495d]">问题描述</Label>
                  <TextArea
                    className={fieldError("content") ? areaErrorClass : areaClass}
                    onBlur={() => blurField("content")}
                    placeholder="请详细描述您遇到的问题, 包括发生时间、影响范围等"
                    rows={6}
                  />
                  {fieldError("content") ? (
                    <p className="text-xs text-[#c4392f]" role="alert">{fieldError("content")}</p>
                  ) : null}
                </TextField>
              </div>

              <p className="text-xs leading-5 text-[#9cb0ba]">
                提交后, 我们的技术支持团队将在 24 小时内响应您的工单。
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button isDisabled={isPending} onPress={onCancel} variant="tertiary">
                取消
              </Button>
              <Button isPending={isPending} onPress={submit} variant="primary">
                {isPending ? (
                  <>
                    <Spinner aria-hidden="true" color="current" size="sm" />
                    正在提交
                  </>
                ) : (
                  "提交工单"
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
