"use client";

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button, Input, Label} from "@heroui/react";
import {useRouter} from "next/navigation";
import {useState} from "react";

import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {notify} from "@/lib/notify";
import {createProduct, type CreateProductInput} from "@/lib/supplier-workspace";

const inputClass =
  "h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";

const typeOptions = [
  {id: "card_rental", label: "零租(按卡租)", hint: "按卡计价, 支持按小时/天/周"},
  {id: "outright", label: "零售买断", hint: "一次性买断机器使用权"},
  {id: "center", label: "成熟算力中心", hint: "整体打包(x卡/x台/约算力)"},
  {id: "colocation", label: "空心机房", hint: "有机房无设备, 仅面议"},
] as const;

const pricingByType: Record<string, {id: string; label: string}[]> = {
  card_rental: [
    {id: "hourly", label: "按小时"},
    {id: "daily", label: "按天"},
    {id: "weekly", label: "按周"},
  ],
  outright: [{id: "perpetual", label: "买断"}],
  center: [
    {id: "daily", label: "按天"},
    {id: "weekly", label: "按周"},
    {id: "monthly", label: "按月"},
    {id: "perpetual", label: "买断"},
  ],
  colocation: [],
};

const regionOptions = ["北京", "上海", "深圳", "华东", "华北", "华南", "西南", "西北"];
const deliveryOptions = [
  {id: "bare_metal", label: "裸金属"},
  {id: "container", label: "容器"},
  {id: "vm", label: "虚拟机"},
  {id: "rack", label: "整机柜"},
];

export default function SupplierProductCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [productType, setProductType] = useState("card_rental");
  const [pricingMode, setPricingMode] = useState("hourly");
  const [form, setForm] = useState({
    gpuModel: "", cardCount: "", machineCount: "", totalPflops: "",
    powerCapacityKw: "", rackCount: "",
    cpuSpec: "", memorySpec: "", storageSpec: "", bandwidthSpec: "",
    deliveryMode: "bare_metal", availableHours: "全天 24h",
    unitPrice: "", stock: "", minOrder: "1", minDuration: "1",
    region: "北京", priceNegotiable: false, complianceAgreed: false,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["supplier", "products"]});
      notify.success("商品已提交, 等待平台审核上架");
      router.push("/console/supplier/products");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "商品发布失败"),
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({...current, [key]: value}));

  const chooseType = (id: string) => {
    setProductType(id);
    const pricing = pricingByType[id];
    if (pricing.length > 0) setPricingMode(pricing[0].id);
    if (id === "colocation") set("priceNegotiable", true);
  };

  const submit = () => {
    const int = (v: string) => (v.trim() === "" ? 0 : Number(v));
    const isColocation = productType === "colocation";

    if (productType !== "colocation" && !form.gpuModel.trim()) return setFormError("请填写 GPU 型号");
    if (productType === "card_rental" && int(form.cardCount) <= 0) return setFormError("卡数必须大于 0");
    if ((productType === "outright" || productType === "center") && int(form.machineCount) <= 0) return setFormError("台数必须大于 0");
    if (productType === "center" && !form.totalPflops.trim()) return setFormError("请填写约算力(如 约128P)");
    if (isColocation && (int(form.powerCapacityKw) <= 0 || int(form.rackCount) <= 0)) return setFormError("空心机房需填写电力容量与机柜数");
    if (!form.priceNegotiable && int(form.unitPrice) <= 0) return setFormError("请填写单价, 或勾选面议");
    if (form.priceNegotiable && int(form.unitPrice) !== 0) return setFormError("面议商品单价必须为 0");
    if (int(form.stock) <= 0) return setFormError("可售库存必须大于 0");
    if (!form.complianceAgreed) return setFormError("请确认合规承诺");

    setFormError(null);
    createMutation.mutate({
      product_type: productType,
      gpu_model: form.gpuModel.trim() || undefined,
      card_count: int(form.cardCount) || undefined,
      machine_count: int(form.machineCount) || undefined,
      total_pflops_approx: form.totalPflops.trim() || undefined,
      power_capacity_kw: int(form.powerCapacityKw) || undefined,
      rack_count: int(form.rackCount) || undefined,
      price_negotiable: form.priceNegotiable,
      cpu_spec: form.cpuSpec.trim() || undefined,
      memory_spec: form.memorySpec.trim() || undefined,
      storage_spec: form.storageSpec.trim() || undefined,
      bandwidth_spec: form.bandwidthSpec.trim() || undefined,
      delivery_mode: form.deliveryMode,
      pricing_mode: pricingMode,
      unit_price: form.priceNegotiable ? 0 : Math.round(Number(form.unitPrice) * 100),
      available_hours: form.availableHours.trim() || undefined,
      stock: int(form.stock),
      min_order: int(form.minOrder) || 1,
      min_duration: int(form.minDuration) || 1,
      region: form.region,
      compliance_agreed: form.complianceAgreed,
    });
  };

  const pricing = pricingByType[productType] ?? [];
  const showGpu = productType !== "colocation";
  const showCard = productType === "card_rental";
  const showMachine = productType === "outright" || productType === "center";
  const showPflops = productType === "center";
  const showColocation = productType === "colocation";

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader title="发布算力" />

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">商品类型</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {typeOptions.map((option) => (
            <button
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                productType === option.id
                  ? "border-[#173447] bg-[#173447] text-white"
                  : "border-[#dce9ee] bg-white/55 text-[#24495d] hover:bg-white/75"
              }`}
              key={option.id}
              onClick={() => chooseType(option.id)}
              type="button"
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className={`mt-1 text-xs ${productType === option.id ? "text-white/70" : "text-[#78909c]"}`}>
                {option.hint}
              </p>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">规格信息</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showGpu ? (
            <Field label="GPU 型号 *">
              <Input className={inputClass} placeholder="例如: NVIDIA H100 SXM 80GB" value={form.gpuModel} onChange={(e) => set("gpuModel", e.target.value)} />
            </Field>
          ) : null}
          {showCard ? (
            <Field label="卡数 *">
              <Input className={inputClass} inputMode="numeric" placeholder="8" value={form.cardCount} onChange={(e) => set("cardCount", e.target.value.replace(/\D/g, ""))} />
            </Field>
          ) : null}
          {showMachine ? (
            <Field label="台数 *">
              <Input className={inputClass} inputMode="numeric" placeholder="4" value={form.machineCount} onChange={(e) => set("machineCount", e.target.value.replace(/\D/g, ""))} />
            </Field>
          ) : null}
          {showPflops ? (
            <Field label="约算力 *">
              <Input className={inputClass} placeholder="约128P" value={form.totalPflops} onChange={(e) => set("totalPflops", e.target.value)} />
            </Field>
          ) : null}
          {showColocation ? (
            <>
              <Field label="电力容量(kW) *">
                <Input className={inputClass} inputMode="numeric" placeholder="2000" value={form.powerCapacityKw} onChange={(e) => set("powerCapacityKw", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="机柜数 *">
                <Input className={inputClass} inputMode="numeric" placeholder="50" value={form.rackCount} onChange={(e) => set("rackCount", e.target.value.replace(/\D/g, ""))} />
              </Field>
            </>
          ) : null}
          <Field label="CPU 规格">
            <Input className={inputClass} placeholder="2× Intel Xeon 8480+" value={form.cpuSpec} onChange={(e) => set("cpuSpec", e.target.value)} />
          </Field>
          <Field label="内存规格">
            <Input className={inputClass} placeholder="2TB DDR5" value={form.memorySpec} onChange={(e) => set("memorySpec", e.target.value)} />
          </Field>
          <Field label="存储规格">
            <Input className={inputClass} placeholder="30TB NVMe" value={form.storageSpec} onChange={(e) => set("storageSpec", e.target.value)} />
          </Field>
          <Field label="带宽规格">
            <Input className={inputClass} placeholder="10Gbps" value={form.bandwidthSpec} onChange={(e) => set("bandwidthSpec", e.target.value)} />
          </Field>
          <Field label="交付方式">
            <div className="flex flex-wrap gap-2 pt-1">
              {deliveryOptions.map((option) => (
                <ChipButton active={form.deliveryMode === option.id} key={option.id} label={option.label} onClick={() => set("deliveryMode", option.id)} />
              ))}
            </div>
          </Field>
          <Field label="可售时段">
            <Input className={inputClass} placeholder="全天 24h / 22:00-08:00" value={form.availableHours} onChange={(e) => set("availableHours", e.target.value)} />
          </Field>
          <Field label="地域 *">
            <div className="flex flex-wrap gap-2 pt-1">
              {regionOptions.map((region) => (
                <ChipButton active={form.region === region} key={region} label={region} onClick={() => set("region", region)} />
              ))}
            </div>
          </Field>
        </div>
      </GlassCard>

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">计费与库存</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pricing.length > 0 ? (
            <Field label="计费模式 *">
              <div className="flex flex-wrap gap-2 pt-1">
                {pricing.map((option) => (
                  <ChipButton active={pricingMode === option.id} key={option.id} label={option.label} onClick={() => setPricingMode(option.id)} />
                ))}
              </div>
            </Field>
          ) : (
            <Field label="计费模式">
              <p className="pt-2 text-sm text-[#78909c]">空心机房仅面议, 线下议价</p>
            </Field>
          )}
          <Field label={form.priceNegotiable ? "单价(面议)" : "单价(元/单位·周期) *"}>
            <div className="flex items-center gap-3">
              <Input
                className={inputClass}
                inputMode="decimal"
                disabled={form.priceNegotiable}
                placeholder={form.priceNegotiable ? "面议" : "35.00"}
                value={form.priceNegotiable ? "" : form.unitPrice}
                onChange={(e) => set("unitPrice", e.target.value.replace(/[^\d.]/g, ""))}
              />
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-[#5e7786]">
                <input
                  checked={form.priceNegotiable}
                  className="size-3.5 accent-[#173447]"
                  onChange={(e) => set("priceNegotiable", e.target.checked)}
                  type="checkbox"
                />
                面议
              </label>
            </div>
          </Field>
          <Field label="可售库存 *">
            <Input className={inputClass} inputMode="numeric" placeholder="16" value={form.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="最小起订量">
            <Input className={inputClass} inputMode="numeric" value={form.minOrder} onChange={(e) => set("minOrder", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="最小计费周期数">
            <Input className={inputClass} inputMode="numeric" value={form.minDuration} onChange={(e) => set("minDuration", e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-[13px] leading-5 text-[#24495d]">
          <input
            checked={form.complianceAgreed}
            className="mt-0.5 size-4 accent-[#173447]"
            onChange={(e) => set("complianceAgreed", e.target.checked)}
            type="checkbox"
          />
          <span>
            我承诺所发布资源来源合法、权属清晰, 不用于虚拟货币挖矿等违规用途,
            并同意平台《算力资源上架规范》。
          </span>
        </label>

        {formError ? (
          <p className="mt-3 text-xs text-[#c4392f]" role="alert">{formError}</p>
        ) : null}

        <div className="mt-5 flex justify-end gap-3 border-t border-[#dce9ee] pt-4">
          <Button onPress={() => router.push("/console/supplier/products")} variant="tertiary">
            取消
          </Button>
          <Button isPending={createMutation.isPending} onPress={submit} variant="primary">
            {createMutation.isPending ? "正在提交" : "提交审核"}
          </Button>
        </div>
      </GlassCard>
    </section>
  );
}

function Field({children, label}: {children: React.ReactNode; label: string}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-medium text-[#24495d]">{label}</Label>
      {children}
    </div>
  );
}

function ChipButton({active, label, onClick}: {active: boolean; label: string; onClick: () => void}) {
  return (
    <button
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-[#173447] text-white"
          : "border border-[#dce9ee] bg-white/60 text-[#5e7786] hover:bg-white/80"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
