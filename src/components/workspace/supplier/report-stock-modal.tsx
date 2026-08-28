"use client";

import {
  Button,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import {useEffect, useState} from "react";

import {
  productTypeCopy,
  type SubmitResourceSyncInput,
  type SupplierProduct,
} from "@/lib/supplier-workspace";

const inputClass =
  "h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";
const inputErrorClass =
  "h-10 rounded-xl border border-[#e5484d]/60 bg-[#fff7f7] px-3.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";

type FieldKey = "productId" | "stockAfter" | "reason";

// 机房余量上报弹窗 (C-05 passive sync): 选择商品 + 实盘余量 + 差异原因。
export function ReportStockModal({
  isPending = false,
  onCancel,
  onSubmit,
  open,
  products,
}: {
  isPending?: boolean;
  onCancel: () => void;
  onSubmit: (input: SubmitResourceSyncInput) => void;
  open: boolean;
  products: SupplierProduct[];
}) {
  const [productId, setProductId] = useState("");
  const [stockAfter, setStockAfter] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  useEffect(() => {
    if (open) {
      setProductId("");
      setStockAfter("");
      setReason("");
      setErrors({});
    }
  }, [open]);

  const selectProduct = (value: string) => {
    setProductId(value);
    const product = products.find((item) => String(item.id) === value);
    // Prefill with the platform stock so the reporter only edits when it differs.
    if (product) setStockAfter(String(product.stock));
  };

  const submit = () => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    const product = products.find((item) => String(item.id) === productId);
    if (!product) nextErrors.productId = "请选择要上报的商品";
    const stock = Number(stockAfter);
    if (!/^\d+$/.test(stockAfter.trim()) || !Number.isSafeInteger(stock)) {
      nextErrors.stockAfter = "请填写非负整数余量";
    }
    if (!reason.trim()) nextErrors.reason = "请填写余量变化原因";
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean) || !product) return;
    onSubmit({
      product_id: product.id,
      stock_after: stock,
      reason: reason.trim(),
    });
  };

  return (
    <Modal.Root isOpen={open} onOpenChange={(isOpen) => { if (!isOpen && !isPending) onCancel(); }}>
      <Modal.Backdrop isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-xl">
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold text-[#173447]">
                上报机房余量
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium text-[#24495d]">商品 *</Label>
                <Select
                  aria-label="选择上报商品"
                  placeholder="选择要上报余量的商品"
                  value={productId}
                  variant="secondary"
                  onChange={(value) => selectProduct(String(value))}
                >
                  <Select.Trigger className={errors.productId ? inputErrorClass : inputClass}>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {products.map((product) => {
                        const model = (product.gpu_model || "算力资源").replace(/^NVIDIA\s+/i, "");
                        const type = productTypeCopy[product.product_type] ?? product.product_type;
                        return (
                          <ListBox.Item
                            id={String(product.id)}
                            key={product.id}
                            textValue={`${model} ${type}`}
                          >
                            {model} · {type} · 平台余量 {product.stock}
                          </ListBox.Item>
                        );
                      })}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {errors.productId ? (
                  <p className="text-xs text-[#c4392f]" role="alert">{errors.productId}</p>
                ) : null}
              </div>
              <TextField
                fullWidth
                className="gap-1.5"
                value={stockAfter}
                variant="secondary"
                onChange={(value) => setStockAfter(value.replace(/\D/g, ""))}
              >
                <Label className="text-[13px] font-medium text-[#24495d]">实盘余量 *</Label>
                <Input
                  className={errors.stockAfter ? inputErrorClass : inputClass}
                  inputMode="numeric"
                  placeholder="机房当前实际可供余量"
                />
                {errors.stockAfter ? (
                  <p className="text-xs text-[#c4392f]" role="alert">{errors.stockAfter}</p>
                ) : null}
              </TextField>
              <TextField fullWidth className="gap-1.5" value={reason} variant="secondary" onChange={setReason}>
                <Label className="text-[13px] font-medium text-[#24495d]">变化原因 *</Label>
                <TextArea
                  className="rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 py-2.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]"
                  placeholder="例如: 自用占用、设备检修下线、线下批量成交"
                  rows={3}
                />
                {errors.reason ? (
                  <p className="text-xs text-[#c4392f]" role="alert">{errors.reason}</p>
                ) : null}
              </TextField>
              <p className="text-xs leading-5 text-[#9cb0ba]">
                上报后平台将按实盘余量更新商品库存; 差异超过 30% 会被标记为异常并触发风控复核。
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
                    正在上报
                  </>
                ) : (
                  "确认上报"
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
