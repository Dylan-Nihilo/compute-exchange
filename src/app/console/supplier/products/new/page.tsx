"use client";

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Button, Input, Label} from "@heroui/react";
import {ArrowLeft, Building2, Cpu, SendHorizontal, Server, Warehouse} from "lucide";
import {useRouter} from "next/navigation";
import {useState} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {notify} from "@/lib/notify";
import {createProduct, type CreateProductInput} from "@/lib/supplier-workspace";

const inputClass = (error?: string) =>
  `h-11 w-full rounded-xl border bg-white/80 px-3.5 text-sm text-[#24495d] outline-none placeholder:text-[#9cb0ba] ${
    error
      ? "border-[#cf6f67] bg-[#fff8f7] focus:border-[#b54d45]"
      : "border-[#afc4ce]/45 focus:border-[#5f8fa3]"
  }`;

const typeOptions = [
  {id: "card_rental", label: "零租（按卡租）", hint: "按小时、天或周计费", icon: Cpu},
  {id: "outright", label: "零售买断", hint: "一次性买断机器使用权", icon: Server},
  {id: "center", label: "成熟算力中心", hint: "按中心整体交付", icon: Building2},
  {id: "colocation", label: "空心机房", hint: "仅提供机房与基础设施", icon: Warehouse},
] as const;

type ProductType = (typeof typeOptions)[number]["id"];

const pricingByType: Record<ProductType, {id: string; label: string}[]> = {
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

type ProductForm = {
  gpuModel: string;
  cardCount: string;
  machineCount: string;
  totalPflops: string;
  powerCapacityKw: string;
  rackCount: string;
  cpuSpec: string;
  memorySpec: string;
  storageSpec: string;
  bandwidthSpec: string;
  deliveryMode: string;
  availableHours: string;
  unitPrice: string;
  stock: string;
  minOrder: string;
  minDuration: string;
  region: string;
  priceNegotiable: boolean;
  complianceAgreed: boolean;
};

type FormErrors = Partial<Record<keyof ProductForm, string>>;

export default function SupplierProductCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [productType, setProductType] = useState<ProductType>("card_rental");
  const [pricingMode, setPricingMode] = useState("hourly");
  const [form, setForm] = useState<ProductForm>({
    gpuModel: "", cardCount: "", machineCount: "", totalPflops: "",
    powerCapacityKw: "", rackCount: "",
    cpuSpec: "", memorySpec: "", storageSpec: "", bandwidthSpec: "",
    deliveryMode: "bare_metal", availableHours: "全天 24h",
    unitPrice: "", stock: "", minOrder: "1", minDuration: "1",
    region: "北京", priceNegotiable: false, complianceAgreed: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});

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

  const set = (key: keyof ProductForm, value: string | boolean) => {
    setForm((current) => ({...current, [key]: value}));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = {...current};
      delete next[key];
      return next;
    });
  };

  const chooseType = (id: ProductType) => {
    setProductType(id);
    const pricing = pricingByType[id];
    if (pricing.length > 0) setPricingMode(pricing[0].id);
    setForm((current) => ({
      ...current,
      priceNegotiable: id === "colocation" ? true : id === "center" ? current.priceNegotiable : false,
      unitPrice: id === "colocation" ? "" : current.unitPrice,
    }));
    setErrors({});
  };

  const submit = () => {
    const int = (v: string) => (v.trim() === "" ? 0 : Number(v));
    const isColocation = productType === "colocation";
    const supportsNegotiable = productType === "center" || isColocation;
    const isNegotiable = supportsNegotiable && form.priceNegotiable;
    const nextErrors: FormErrors = {};

    if (!isColocation && !form.gpuModel.trim()) nextErrors.gpuModel = "请输入 GPU 型号";
    if (productType === "card_rental" && int(form.cardCount) <= 0) nextErrors.cardCount = "请输入大于 0 的卡数";
    if ((productType === "outright" || productType === "center") && int(form.machineCount) <= 0) nextErrors.machineCount = "请输入大于 0 的台数";
    if (productType === "center" && !form.totalPflops.trim()) nextErrors.totalPflops = "请输入中心约算力";
    if (isColocation && int(form.powerCapacityKw) <= 0) nextErrors.powerCapacityKw = "请输入电力容量";
    if (isColocation && int(form.rackCount) <= 0) nextErrors.rackCount = "请输入机柜数";
    if (!isNegotiable && Number(form.unitPrice) <= 0) nextErrors.unitPrice = "请输入大于 0 的单价";
    if (int(form.stock) <= 0) nextErrors.stock = "请输入大于 0 的可售库存";
    if (!form.complianceAgreed) nextErrors.complianceAgreed = "请确认合规承诺";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstField = Object.keys(nextErrors)[0];
      requestAnimationFrame(() => document.getElementById(`product-${firstField}`)?.focus());
      return;
    }

    setErrors({});
    createMutation.mutate({
      product_type: productType,
      gpu_model: form.gpuModel.trim() || undefined,
      card_count: int(form.cardCount) || undefined,
      machine_count: int(form.machineCount) || undefined,
      total_pflops_approx: form.totalPflops.trim() || undefined,
      power_capacity_kw: int(form.powerCapacityKw) || undefined,
      rack_count: int(form.rackCount) || undefined,
      price_negotiable: isNegotiable,
      cpu_spec: form.cpuSpec.trim() || undefined,
      memory_spec: form.memorySpec.trim() || undefined,
      storage_spec: form.storageSpec.trim() || undefined,
      bandwidth_spec: form.bandwidthSpec.trim() || undefined,
      delivery_mode: form.deliveryMode,
      pricing_mode: pricingMode,
      unit_price: isNegotiable ? 0 : Math.round(Number(form.unitPrice) * 100),
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
  const supportsNegotiable = productType === "center" || showColocation;

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        actions={(
          <Button onPress={() => router.push("/console/supplier/products")} variant="tertiary">
            <InteractiveIcon icon={ArrowLeft} size={16} />
            返回商品
          </Button>
        )}
        title="发布算力"
      />

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">商品类型</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {typeOptions.map((option) => (
            <button
              aria-pressed={productType === option.id}
              className={`group rounded-xl border px-4 py-3.5 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 ${
                productType === option.id
                  ? "border-[#173447] bg-[#173447] text-white"
                  : "border-[#dce9ee] bg-white/55 text-[#24495d] hover:bg-white/90"
              }`}
              key={option.id}
              onClick={() => chooseType(option.id)}
              type="button"
            >
              <span className="flex items-center gap-2.5">
                <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${productType === option.id ? "bg-white/12" : "bg-[#edf5f7] text-[#477084]"}`}>
                  <InteractiveIcon icon={option.icon} size={17} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className={`mt-0.5 block text-xs ${productType === option.id ? "text-white/70" : "text-[#78909c]"}`}>
                    {option.hint}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">规格信息</h2>
        <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {showGpu ? (
            <Field error={errors.gpuModel} label="GPU 型号 *">
              <Input aria-invalid={Boolean(errors.gpuModel)} className={inputClass(errors.gpuModel)} id="product-gpuModel" placeholder="例如：NVIDIA H100 SXM 80GB" value={form.gpuModel} onChange={(e) => set("gpuModel", e.target.value)} />
            </Field>
          ) : null}
          {showCard ? (
            <Field error={errors.cardCount} label="卡数 *">
              <Input aria-invalid={Boolean(errors.cardCount)} className={inputClass(errors.cardCount)} id="product-cardCount" inputMode="numeric" placeholder="8" value={form.cardCount} onChange={(e) => set("cardCount", e.target.value.replace(/\D/g, ""))} />
            </Field>
          ) : null}
          {showMachine ? (
            <Field error={errors.machineCount} label="台数 *">
              <Input aria-invalid={Boolean(errors.machineCount)} className={inputClass(errors.machineCount)} id="product-machineCount" inputMode="numeric" placeholder="4" value={form.machineCount} onChange={(e) => set("machineCount", e.target.value.replace(/\D/g, ""))} />
            </Field>
          ) : null}
          {showPflops ? (
            <Field error={errors.totalPflops} label="约算力 *">
              <Input aria-invalid={Boolean(errors.totalPflops)} className={inputClass(errors.totalPflops)} id="product-totalPflops" placeholder="例如：约 128P" value={form.totalPflops} onChange={(e) => set("totalPflops", e.target.value)} />
            </Field>
          ) : null}
          {showColocation ? (
            <>
              <Field error={errors.powerCapacityKw} label="电力容量（kW）*">
                <Input aria-invalid={Boolean(errors.powerCapacityKw)} className={inputClass(errors.powerCapacityKw)} id="product-powerCapacityKw" inputMode="numeric" placeholder="2000" value={form.powerCapacityKw} onChange={(e) => set("powerCapacityKw", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field error={errors.rackCount} label="机柜数 *">
                <Input aria-invalid={Boolean(errors.rackCount)} className={inputClass(errors.rackCount)} id="product-rackCount" inputMode="numeric" placeholder="50" value={form.rackCount} onChange={(e) => set("rackCount", e.target.value.replace(/\D/g, ""))} />
              </Field>
            </>
          ) : null}
          <Field label="CPU 规格">
            <Input className={inputClass()} placeholder="2× Intel Xeon 8480+" value={form.cpuSpec} onChange={(e) => set("cpuSpec", e.target.value)} />
          </Field>
          <Field label="内存规格">
            <Input className={inputClass()} placeholder="2TB DDR5" value={form.memorySpec} onChange={(e) => set("memorySpec", e.target.value)} />
          </Field>
          <Field label="存储规格">
            <Input className={inputClass()} placeholder="30TB NVMe" value={form.storageSpec} onChange={(e) => set("storageSpec", e.target.value)} />
          </Field>
          <Field label="带宽规格">
            <Input className={inputClass()} placeholder="10Gbps" value={form.bandwidthSpec} onChange={(e) => set("bandwidthSpec", e.target.value)} />
          </Field>
          <Field label="交付方式">
            <div className="flex flex-wrap gap-2 pt-1">
              {deliveryOptions.map((option) => (
                <ChipButton active={form.deliveryMode === option.id} key={option.id} label={option.label} onClick={() => set("deliveryMode", option.id)} />
              ))}
            </div>
          </Field>
          <Field label="可售时段">
            <Input className={inputClass()} placeholder="全天 24h / 22:00–08:00" value={form.availableHours} onChange={(e) => set("availableHours", e.target.value)} />
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
        <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {pricing.length > 0 ? (
            <Field label="计费模式 *">
              <div className="flex flex-wrap gap-2 pt-1">
                {pricing.map((option) => (
                  <ChipButton active={pricingMode === option.id} key={option.id} label={option.label} onClick={() => setPricingMode(option.id)} />
                ))}
              </div>
            </Field>
          ) : null}
          {supportsNegotiable ? (
            <Field label="价格方式 *">
              <div className="flex flex-wrap gap-2 pt-1">
                {!showColocation ? (
                  <ChipButton active={!form.priceNegotiable} label="固定价格" onClick={() => set("priceNegotiable", false)} />
                ) : null}
                <ChipButton active={form.priceNegotiable} label="面议" onClick={() => set("priceNegotiable", true)} />
              </div>
            </Field>
          ) : null}
          {!form.priceNegotiable ? (
            <Field error={errors.unitPrice} label="单价（元 / 单位·周期）*">
              <div className="relative">
                <Input
                  aria-invalid={Boolean(errors.unitPrice)}
                  className={`${inputClass(errors.unitPrice)} pr-12`}
                  id="product-unitPrice"
                  inputMode="decimal"
                  placeholder="35.00"
                  value={form.unitPrice}
                  onChange={(e) => set("unitPrice", e.target.value.replace(/[^\d.]/g, ""))}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-[#78909c]">元</span>
              </div>
            </Field>
          ) : null}
          <Field error={errors.stock} label="可售库存 *">
            <Input aria-invalid={Boolean(errors.stock)} className={inputClass(errors.stock)} id="product-stock" inputMode="numeric" placeholder="16" value={form.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="最小起订量">
            <Input className={inputClass()} inputMode="numeric" value={form.minOrder} onChange={(e) => set("minOrder", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <Field label="最小计费周期数">
            <Input className={inputClass()} inputMode="numeric" value={form.minDuration} onChange={(e) => set("minDuration", e.target.value.replace(/\D/g, ""))} />
          </Field>
        </div>

        <div className={`mt-5 rounded-xl border px-4 py-3.5 ${errors.complianceAgreed ? "border-[#cf6f67] bg-[#fff8f7]" : "border-[#dce9ee] bg-white/45"}`}>
          <label className="flex items-start gap-2.5 text-[13px] leading-5 text-[#24495d]">
            <input
              checked={form.complianceAgreed}
              className="mt-0.5 size-4 accent-[#173447]"
              id="product-complianceAgreed"
              onChange={(e) => set("complianceAgreed", e.target.checked)}
              type="checkbox"
            />
            <span>
              我承诺所发布资源来源合法、权属清晰，不用于虚拟货币挖矿等违规用途，
              并同意平台《算力资源上架规范》。
            </span>
          </label>
          {errors.complianceAgreed ? (
            <p className="mt-1.5 pl-6 text-xs text-[#b54d45]" role="alert">{errors.complianceAgreed}</p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-3 border-t border-[#dce9ee] pt-4">
          <Button onPress={() => router.push("/console/supplier/products")} variant="tertiary">
            取消
          </Button>
          <Button isPending={createMutation.isPending} onPress={submit} variant="primary">
            <InteractiveIcon icon={SendHorizontal} size={16} />
            {createMutation.isPending ? "正在提交" : "提交审核"}
          </Button>
        </div>
      </GlassCard>
    </section>
  );
}

function Field({children, error, label}: {children: React.ReactNode; error?: string; label: string}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-medium text-[#24495d]">{label}</Label>
      {children}
      {error ? <p className="text-xs text-[#b54d45]" role="alert">{error}</p> : null}
    </div>
  );
}

function ChipButton({active, label, onClick}: {active: boolean; label: string; onClick: () => void}) {
  return (
    <button
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-[color,background-color,border-color,transform] hover:-translate-y-px ${
        active
          ? "bg-[#173447] text-white"
          : "border border-[#dce9ee] bg-white/60 text-[#5e7786] hover:border-[#afc4ce] hover:bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
