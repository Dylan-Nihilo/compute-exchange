"use client";

import {useMutation} from "@tanstack/react-query";
import {Button} from "@heroui/react";
import Link from "next/link";
import {useState} from "react";

import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {equipmentTypeLabels, equipmentTypes, type EquipmentItem} from "@/lib/equipment-api";
import {
  createEquipmentProduct,
  updateEquipmentProduct,
  type CreateEquipmentInput,
} from "@/lib/equipment-workspace";

const fieldClass =
  "mt-1.5 h-10 w-full rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba] outline-none focus:border-[#24495d] disabled:opacity-50";
const areaClass =
  "mt-1.5 w-full rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 py-2.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba] outline-none focus:border-[#24495d]";
const labelClass = "block text-[13px] font-medium text-[#24495d]";

const regionOptions = ["北京", "上海", "深圳", "杭州", "成都", "乌兰察布"] as const;
const minManufactureYear = 2010;

// product 传入时为「修改并重提」模式(仅 draft/被驳回可改), 否则为新发布; 两者提交后都回 pending 重新审核。
export function SupplierEquipmentForm({product}: {product?: EquipmentItem}) {
  const [condition, setCondition] = useState<"new" | "used">(product?.condition ?? "new");
  const [negotiable, setNegotiable] = useState(product?.priceNegotiable ?? false);
  const [validationError, setValidationError] = useState("");
  const mutation = useMutation({
    mutationFn: (input: CreateEquipmentInput) =>
      product ? updateEquipmentProduct(product.id, input) : createEquipmentProduct(input),
  });
  const currentYear = new Date().getFullYear();
  const pageTitle = product ? "修改设备商品" : "发布设备商品";

  if (mutation.isSuccess) {
    return (
      <section className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6">
        <WorkspacePageHeader title={pageTitle} />
        <GlassCard className="px-6 py-6">
          <h2 className="text-[15px] font-semibold text-[#173447]" role="status">
            {product ? "商品已重新提交审核" : "商品已提交审核"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4b6276]">
            商品编号 #{mutation.data.id}，当前状态：待审核。运营审核通过后将在设备市场上架；买家询价会进入「设备商品管理 · 收到的询价」。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="rounded-xl bg-[#c9f556] px-5 py-2.5 text-sm font-semibold text-[#173447] hover:bg-[#b8e643]" href="/console/supplier/equipments">
              返回设备商品管理
            </Link>
            <Link className="rounded-xl border border-[#afc4ce]/45 bg-white/80 px-5 py-2.5 text-sm font-semibold text-[#24495d]" href="/equipment-market">
              查看设备市场
            </Link>
          </div>
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6">
      <WorkspacePageHeader title={pageTitle} />
      <GlassCard className="px-6 py-6">
        <p className="text-xs leading-5 text-[#78909c]">
          设备为询价撮合、不支持在线支付。二手设备必须填写出厂年份与使用情况，提交后经运营审核上架。
        </p>
        {product?.rejectedReason ? (
          <p className="mt-3 rounded-xl border border-[#ecc9c6] bg-[#fff8f7] px-4 py-3 text-sm leading-6 text-[#7e3d38]" role="alert">
            上次审核驳回原因：{product.rejectedReason}。请修改后重新提交，重提后将再次进入运营审核。
          </p>
        ) : null}
        <form
          className="mt-5 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (mutation.isPending) return;
            const data = new FormData(event.currentTarget);
            const field = (name: string) => String(data.get(name) ?? "").trim();
            const manufactureYear = field("manufacture_year") ? Number(field("manufacture_year")) : undefined;
            const priceYuan = field("unit_price") ? Number(field("unit_price")) : 0;

            if (condition === "used") {
              if (!manufactureYear) {
                setValidationError("二手设备必须填写出厂年份。");
                return;
              }
              if (manufactureYear < minManufactureYear || manufactureYear > currentYear) {
                setValidationError(`出厂年份必须在 ${minManufactureYear} ~ ${currentYear} 之间。`);
                return;
              }
              if (!field("usage_desc")) {
                setValidationError("二手设备必须填写使用情况（使用年限、运行强度、检测结论等）。");
                return;
              }
            }
            if (!negotiable && (!Number.isFinite(priceYuan) || priceYuan <= 0)) {
              setValidationError("请填写单价（元），或勾选「价格面议」。");
              return;
            }
            setValidationError("");
            mutation.mutate({
              title: field("title"),
              equipment_type: field("equipment_type"),
              brand: field("brand") || undefined,
              model: field("model") || undefined,
              condition_type: condition,
              manufacture_year: manufactureYear,
              usage_desc: field("usage_desc") || undefined,
              quantity: Number(field("quantity")),
              unit_price: negotiable ? 0 : Math.round(priceYuan * 100),
              price_negotiable: negotiable,
              region: field("region"),
              description: field("description") || undefined,
            });
          }}
        >
          <fieldset className="space-y-5" disabled={mutation.isPending}>
            <label className={labelClass}>
              商品标题 <span aria-hidden="true" className="text-[#c4392f]">*</span>
              <input className={fieldClass} defaultValue={product?.title} maxLength={128} name="title" placeholder="如 NVIDIA H100 SXM 8-GPU 整机" required />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>
                设备类型 <span aria-hidden="true" className="text-[#c4392f]">*</span>
                <select className={fieldClass} defaultValue={product?.equipmentType ?? "gpu_server"} name="equipment_type" required>
                  {equipmentTypes.map((type) => (
                    <option key={type} value={type}>{equipmentTypeLabels[type]}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                成色 <span aria-hidden="true" className="text-[#c4392f]">*</span>
                <select
                  className={fieldClass}
                  name="condition_type"
                  value={condition}
                  onChange={(event) => setCondition(event.target.value === "used" ? "used" : "new")}
                >
                  <option value="new">一手（全新）</option>
                  <option value="used">二手</option>
                </select>
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>
                品牌（选填）
                <input className={fieldClass} defaultValue={product?.brand} maxLength={64} name="brand" placeholder="如 NVIDIA / 华为 / 浪潮" />
              </label>
              <label className={labelClass}>
                型号（选填）
                <input className={fieldClass} defaultValue={product?.model} maxLength={64} name="model" placeholder="如 HGX H100" />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className={labelClass}>
                出厂年份{condition === "used" ? <span aria-hidden="true" className="text-[#c4392f]"> *</span> : "（选填）"}
                <input
                  className={fieldClass}
                  defaultValue={product?.manufactureYear ?? undefined}
                  max={currentYear}
                  min={minManufactureYear}
                  name="manufacture_year"
                  placeholder={`如 ${currentYear - 3}`}
                  required={condition === "used"}
                  type="number"
                />
              </label>
              <label className={labelClass}>
                数量 <span aria-hidden="true" className="text-[#c4392f]">*</span>
                <input className={fieldClass} defaultValue={product?.quantity} min={1} name="quantity" placeholder="如 12" required type="number" />
              </label>
            </div>

            <label className={labelClass}>
              使用情况{condition === "used" ? <span aria-hidden="true" className="text-[#c4392f]"> *</span> : "（选填）"}
              <textarea
                className={`${areaClass} min-h-20`}
                defaultValue={product?.usageDesc}
                maxLength={256}
                name="usage_desc"
                placeholder="二手必填：使用年限、运行强度、检测结论、是否有坏卡等"
                required={condition === "used"}
              />
            </label>

            <div className="grid items-end gap-5 sm:grid-cols-2">
              <label className={labelClass}>
                单价（元）{negotiable ? "" : <span aria-hidden="true" className="text-[#c4392f]"> *</span>}
                <input
                  className={fieldClass}
                  defaultValue={product?.unitPriceMinor !== undefined ? product.unitPriceMinor / 100 : undefined}
                  disabled={negotiable}
                  min={0}
                  name="unit_price"
                  placeholder="如 2480000"
                  step="0.01"
                  type="number"
                />
              </label>
              <label className={labelClass}>
                地域 <span aria-hidden="true" className="text-[#c4392f]">*</span>
                <select className={fieldClass} defaultValue={product?.region || "北京"} name="region" required>
                  {product?.region && !(regionOptions as readonly string[]).includes(product.region) ? (
                    <option value={product.region}>{product.region}</option>
                  ) : null}
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#24495d]">
              <input
                checked={negotiable}
                className="h-4 w-4 accent-[#173447]"
                type="checkbox"
                onChange={(event) => setNegotiable(event.target.checked)}
              />
              价格面议（勾选后不展示单价，由采购顾问按项目报价）
            </label>

            <label className={labelClass}>
              商品描述（选填）
              <textarea
                className={`${areaClass} min-h-24`}
                defaultValue={product?.description}
                maxLength={2000}
                name="description"
                placeholder="配置详情、质保政策、是否含安装服务等"
              />
            </label>
          </fieldset>

          {validationError ? <p className="text-sm text-danger" role="alert">{validationError}</p> : null}
          {mutation.isError ? (
            <p className="text-sm text-danger" role="alert">
              {mutation.error instanceof Error ? mutation.error.message : "设备商品发布失败"}
            </p>
          ) : null}

          <Button
            className="h-11 w-full rounded-xl bg-[#c9f556] text-sm font-semibold text-[#173447] hover:bg-[#b8e643]"
            isDisabled={mutation.isPending}
            isPending={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? "正在提交…" : product ? "重新提交审核" : "提交审核"}
          </Button>
        </form>
      </GlassCard>
    </section>
  );
}
