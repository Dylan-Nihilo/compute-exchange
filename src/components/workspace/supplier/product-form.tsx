"use client";

import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Autocomplete, Button, Input, Label, ListBox, SearchField, Select, Spinner} from "@heroui/react";
import {ArrowLeft, Building2, ChevronDown, Cpu, Search, SendHorizontal, Server, Warehouse} from "lucide";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {
  gpuCatalogResponseSchema,
  type GpuCatalogItem,
} from "@/lib/gpu-catalog";
import {notify} from "@/lib/notify";
import {createProduct, resubmitProduct, type SupplierProduct, type CreateProductInput} from "@/lib/supplier-workspace";

const inputClass = (error?: string) =>
  `h-11 w-full rounded-xl border bg-white/80 px-3.5 text-sm text-[#24495d] outline-none placeholder:text-[#9cb0ba] focus-visible:ring-2 focus-visible:ring-[#5f8fa3]/25 focus-visible:ring-offset-1 ${
    error
      ? "border-[#cf6f67] bg-[#fff8f7] focus:border-[#b54d45]"
      : "border-[#afc4ce]/45 focus:border-[#5f8fa3]"
  }`;

const selectTriggerClass = (error?: string) =>
  `h-11 items-center rounded-xl border bg-white/80 px-3.5 py-0 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] outline-none focus-visible:ring-2 focus-visible:ring-[#5f8fa3]/25 focus-visible:ring-offset-1 ${
    error ? "border-[#cf6f67] bg-[#fff8f7]" : "border-[#afc4ce]/45"
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

const billingPeriodLabels: Record<string, string> = {
  hourly: "小时",
  daily: "天",
  weekly: "周",
  monthly: "月",
  perpetual: "买断",
};

const regionOptions = ["北京", "上海", "深圳", "华东", "华北", "华南", "西南", "西北"];
const deliveryOptions = [
  {id: "bare_metal", label: "裸金属"},
  {id: "container", label: "容器"},
  {id: "vm", label: "虚拟机"},
  {id: "rack", label: "整机柜"},
];

const gpuVendors = [
  {id: "nvidia", label: "NVIDIA", logo: "/brand/vendors/nvidia.svg", width: 31},
  {id: "amd", label: "AMD", logo: "/brand/vendors/amd.svg", width: 52},
  {id: "intel", label: "Intel", logo: "/brand/vendors/intel.svg", width: 44},
] as const;

const cardCountOptions = ["1", "2", "4", "8", "16", "32", "64"];
const machineCountOptions = ["1", "2", "4", "8", "16", "32"];
const cpuOptions = [
  "2× Intel Xeon 8480+",
  "2× Intel Xeon 8468",
  "2× AMD EPYC 9654",
  "2× AMD EPYC 9554",
  "1× AMD EPYC 9354P",
];
const memoryOptions = ["256GB DDR5", "512GB DDR5", "1TB DDR5", "2TB DDR5", "4TB DDR5"];
const storageOptions = ["3.84TB NVMe", "7.68TB NVMe", "15.36TB NVMe", "30.72TB NVMe", "61.44TB NVMe"];
const bandwidthOptions = ["10Gbps", "25Gbps", "50Gbps", "100Gbps", "200Gbps", "400Gbps"];
const availableHourOptions = ["全天 24h", "工作日 09:00–18:00", "夜间 22:00–08:00"];

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

export function SupplierProductForm({product}: {product?: SupplierProduct}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [productType, setProductType] = useState<ProductType>((product?.product_type as ProductType) ?? "card_rental");
  const [pricingMode, setPricingMode] = useState(product?.pricing_mode ?? "hourly");
  const [form, setForm] = useState<ProductForm>(() => ({
    gpuModel: product?.gpu_model ?? "", cardCount: String(product?.card_count || ""),
    machineCount: String(product?.machine_count ?? ""), totalPflops: product?.total_pflops_approx ?? "",
    powerCapacityKw: String(product?.power_capacity_kw ?? ""), rackCount: String(product?.rack_count ?? ""),
    cpuSpec: product?.cpu_spec ?? "", memorySpec: product?.memory_spec ?? "",
    storageSpec: product?.storage_spec ?? "", bandwidthSpec: product?.bandwidth_spec ?? "",
    deliveryMode: product?.delivery_mode || "bare_metal", availableHours: product?.available_hours ?? "全天 24h",
    unitPrice: product ? String(product.unit_price / 100) : "", stock: String(product?.stock ?? ""),
    minOrder: String(product?.min_order ?? 1), minDuration: String(product?.min_duration ?? 1),
    region: product?.region ?? "北京", priceNegotiable: product?.price_negotiable ?? false, complianceAgreed: false,
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  const createMutation = useMutation({
    mutationFn: (input: CreateProductInput) => product ? resubmitProduct(product.id, input) : createProduct(input),
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
  const inventoryUnit = productType === "card_rental" ? "卡" : productType === "colocation" ? "机柜" : "台";
  const billingPeriod = billingPeriodLabels[pricingMode] ?? "周期";
  const isPerpetual = pricingMode === "perpetual";

  return (
    <section className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        actions={(
          <Button onPress={() => router.push("/console/supplier/products")} variant="tertiary">
            <InteractiveIcon icon={ArrowLeft} size={16} />
            返回商品
          </Button>
        )}
        title={product ? "修改算力商品" : "发布算力"}
      />

      {product?.rejected_reason ? (
        <p className="rounded-xl border border-[#ecc9c6] bg-[#fff8f7] px-4 py-3 text-sm text-[#b63b35]">驳回原因：{product.rejected_reason}</p>
      ) : null}

      <fieldset className="min-w-0">
        <legend className="mb-3 text-[13px] font-medium text-[#24495d]">商品类型</legend>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {typeOptions.map((option) => (
            <button
              aria-pressed={productType === option.id}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#5f8fa3] focus-visible:ring-offset-2 ${
                productType === option.id
                  ? "border-[#173447] bg-[#173447] text-white"
                  : "border-[#dce9ee] bg-white/60 text-[#24495d] hover:border-[#afc4ce] hover:bg-white"
              }`}
              key={option.id}
              onClick={() => chooseType(option.id)}
              type="button"
            >
              <InteractiveIcon icon={option.icon} size={16} />
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs text-[#5e7786]">{typeOptions.find((option) => option.id === productType)?.hint}</p>
      </fieldset>

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">规格信息</h2>
        <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {showGpu ? (
            <GpuModelField
              error={errors.gpuModel}
              onChange={(value) => set("gpuModel", value)}
              value={form.gpuModel}
            />
          ) : null}
          {showCard ? (
            <PresetField
              error={errors.cardCount}
              id="product-cardCount"
              label="卡数 *"
              onChange={(value) => set("cardCount", value)}
              options={cardCountOptions}
              placeholder="填写卡数"
              sanitize={(value) => value.replace(/\D/g, "")}
              value={form.cardCount}
            />
          ) : null}
          {showMachine ? (
            <PresetField
              error={errors.machineCount}
              id="product-machineCount"
              label="台数 *"
              onChange={(value) => set("machineCount", value)}
              options={machineCountOptions}
              placeholder="填写台数"
              sanitize={(value) => value.replace(/\D/g, "")}
              value={form.machineCount}
            />
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
          <PresetField id="product-cpuSpec" label="CPU 规格" onChange={(value) => set("cpuSpec", value)} options={cpuOptions} placeholder="填写 CPU 规格" value={form.cpuSpec} />
          <PresetField id="product-memorySpec" label="主机内存" onChange={(value) => set("memorySpec", value)} options={memoryOptions} placeholder="填写主机内存" value={form.memorySpec} />
          <PresetField id="product-storageSpec" label="本地存储" onChange={(value) => set("storageSpec", value)} options={storageOptions} placeholder="填写存储规格" value={form.storageSpec} />
          <PresetField id="product-bandwidthSpec" label="网络带宽" onChange={(value) => set("bandwidthSpec", value)} options={bandwidthOptions} placeholder="填写网络带宽" value={form.bandwidthSpec} />
          <Field label="交付方式">
            <div className="flex flex-wrap gap-2 pt-1">
              {deliveryOptions.map((option) => (
                <ChipButton active={form.deliveryMode === option.id} key={option.id} label={option.label} onClick={() => set("deliveryMode", option.id)} />
              ))}
            </div>
          </Field>
          <PresetField id="product-availableHours" label="可售时段" onChange={(value) => set("availableHours", value)} options={availableHourOptions} placeholder="填写可售时段" value={form.availableHours} />
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
        <div className={`mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2 ${supportsNegotiable ? "xl:grid-cols-3" : ""}`}>
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
            <Field error={errors.unitPrice} label="单价 *">
              <div className="relative">
                <Input
                  aria-invalid={Boolean(errors.unitPrice)}
                  className={`${inputClass(errors.unitPrice)} pr-28 pl-9 text-base font-medium tabular-nums`}
                  id="product-unitPrice"
                  inputMode="decimal"
                  placeholder="35.00"
                  value={form.unitPrice}
                  onChange={(e) => set("unitPrice", e.target.value.replace(/[^\d.]/g, ""))}
                />
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm font-medium text-[#5e7786]">¥</span>
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-[#78909c]">
                  {isPerpetual ? `/ ${inventoryUnit}` : `/ ${inventoryUnit}·${billingPeriod}`}
                </span>
              </div>
            </Field>
          ) : null}
        </div>

        <div className={`mt-5 grid gap-x-5 gap-y-4 border-t border-[#dce9ee] pt-5 ${isPerpetual ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          <Field error={errors.stock} label="可售库存 *">
            <div className="relative">
              <Input aria-invalid={Boolean(errors.stock)} className={`${inputClass(errors.stock)} pr-12 tabular-nums`} id="product-stock" inputMode="numeric" placeholder="16" value={form.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-[#78909c]">{inventoryUnit}</span>
            </div>
          </Field>
          <Field label="最小起订量">
            <div className="relative">
              <Input className={`${inputClass()} pr-12 tabular-nums`} id="product-minOrder" inputMode="numeric" value={form.minOrder} onChange={(e) => set("minOrder", e.target.value.replace(/\D/g, ""))} />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-[#78909c]">{inventoryUnit}</span>
            </div>
          </Field>
          {!isPerpetual ? (
            <Field label="最小租用周期">
              <div className="relative">
                <Input className={`${inputClass()} pr-16 tabular-nums`} id="product-minDuration" inputMode="numeric" value={form.minDuration} onChange={(e) => set("minDuration", e.target.value.replace(/\D/g, ""))} />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-[#78909c]">{billingPeriod}</span>
              </div>
            </Field>
          ) : null}
        </div>

        <div className="mt-5 grid items-center gap-4 border-t border-[#dce9ee] pt-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className={`rounded-xl border px-4 py-3.5 ${errors.complianceAgreed ? "border-[#cf6f67] bg-[#fff8f7]" : "border-[#dce9ee] bg-white/45"}`}>
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
          <div className="flex justify-end gap-3">
            <Button onPress={() => router.push("/console/supplier/products")} variant="tertiary">
              取消
            </Button>
            <Button isPending={createMutation.isPending} onPress={submit} variant="primary">
              <InteractiveIcon icon={SendHorizontal} size={16} />
              {createMutation.isPending ? "正在提交" : product ? "重新提交审核" : "提交审核"}
            </Button>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

function GpuModelField({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [vendor, setVendor] = useState<(typeof gpuVendors)[number]["id"]>("nvidia");
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<GpuCatalogItem[]>([]);
  const [selectedGpu, setSelectedGpu] = useState<GpuCatalogItem | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    const search = query.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setItems([]);
      setStatus("loading");
      try {
        const params = new URLSearchParams({vendor});
        if (search.length >= 2) params.set("q", search);
        const response = await fetch(`/api/catalog/gpu-models?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("GPU catalog unavailable");
        const payload = gpuCatalogResponseSchema.parse(await response.json());
        setItems(payload.data.list);
        setStatus(payload.data.list.length ? "ready" : "empty");
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setItems([]);
        setStatus("error");
      }
    }, search.length >= 2 ? 220 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, vendor]);

  const details = selectedGpu
    ? [
        ["系列", selectedGpu.generation],
        ["架构", selectedGpu.architecture],
        ["显存", selectedGpu.memorySizeGb ? `${selectedGpu.memorySizeGb}GB ${selectedGpu.memoryType ?? ""}`.trim() : undefined],
        ["接口", selectedGpu.busInterface ?? selectedGpu.formFactor],
        ["功耗", selectedGpu.tdpWatts ? `${selectedGpu.tdpWatts}W` : undefined],
      ].filter((detail): detail is [string, string] => Boolean(detail[1]))
    : [];

  return (
    <div className="sm:col-span-2">
      <Field error={error} errorId="product-gpuModel-error" label="GPU 型号 *">
        <Autocomplete<GpuCatalogItem>
          allowsEmptyCollection
          aria-label="GPU 型号"
          fullWidth
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          onChange={(key) => {
            const selected = items.find((item) => item.id === key);
            if (!selected) return;
            setSelectedGpu(selected);
            onChange(selected.name);
          }}
          placeholder="选择 GPU 型号"
          value={selectedGpu?.id ?? null}
        >
          <Autocomplete.Trigger className="h-auto border-0 bg-transparent p-0 shadow-none">
            <button
              aria-describedby={error ? "product-gpuModel-error" : undefined}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
              aria-label={value ? `GPU 型号：${value}` : "选择 GPU 型号"}
              className={`${selectTriggerClass(error)} flex w-full gap-2.5 text-left`}
              id="product-gpuModel"
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(!isOpen);
              }}
              type="button"
            >
              <InteractiveIcon aria-hidden="true" className="shrink-0 text-[#78909c]" icon={Search} size={16} />
              <Autocomplete.Value className={`min-w-0 flex-1 truncate ${value ? "text-[#24495d]" : "text-[#78909c]"}`}>
                {value || "选择或搜索 GPU 型号"}
              </Autocomplete.Value>
              <Autocomplete.Indicator><InteractiveIcon aria-hidden="true" className="shrink-0" icon={ChevronDown} size={16} /></Autocomplete.Indicator>
            </button>
          </Autocomplete.Trigger>
          <Autocomplete.Popover className="w-[var(--trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#dce9ee] bg-white p-0 shadow-[0_16px_44px_rgba(36,73,93,0.16)]">
            <div aria-label="按 GPU 厂商筛选" className="flex gap-1 border-b border-[#dce9ee] bg-[#f5fafc] p-2" role="group">
              {gpuVendors.map((option) => (
                <button
                  aria-pressed={vendor === option.id}
                  className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#5f8fa3] ${vendor === option.id ? "bg-white text-[#173447] shadow-sm" : "text-[#5e7786] hover:bg-white/70"}`}
                  key={option.id}
                  onClick={() => {
                    if (vendor === option.id) return;
                    setVendor(option.id);
                    setQuery("");
                    setItems([]);
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Autocomplete.Filter inputValue={query} onInputChange={setQuery}>
              <SearchField aria-label="搜索 GPU 型号" className="px-3 pt-3 pb-1" autoFocus>
                <SearchField.Group className="h-10 rounded-lg border border-[#dce9ee] bg-[#f5fafc] shadow-none">
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="搜索型号，如 H200、MI300X" />
                  <SearchField.ClearButton aria-label="清空搜索" />
                </SearchField.Group>
              </SearchField>
              <ListBox<GpuCatalogItem>
                aria-label="GPU 型号列表"
                items={items}
                className="max-h-64 overflow-y-auto p-1.5 outline-none"
                renderEmptyState={() => (
                  <div className="flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-xs text-[#78909c]" role="status">
                    {status === "loading" ? (
                      <><Spinner aria-hidden="true" color="current" size="sm" />正在读取 {gpuVendors.find((item) => item.id === vendor)?.label} 型号</>
                    ) : status === "error" ? (
                      "型号库暂不可用，可继续手动填写"
                    ) : (
                      "没有匹配型号，可继续手动填写"
                    )}
                  </div>
                )}
              >
                {(gpu) => {
                  const gpuVendor = gpuVendors.find((option) => option.id === gpu.vendorId);
                  return (
                    <ListBox.Item
                      className="group flex cursor-default items-center justify-between gap-4 rounded-lg px-3 py-2.5 outline-none transition-colors data-[focused]:bg-[#edf5f7] data-[selected]:bg-[#e5f0f4]"
                      id={gpu.id}
                      textValue={gpu.name}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        {gpuVendor ? (
                          <span className="hidden h-8 w-14 shrink-0 items-center justify-center rounded-lg border border-[#dce9ee]/70 bg-white/80 sm:flex">
                            <Image alt="" height={18} src={gpuVendor.logo} width={gpuVendor.width} />
                          </span>
                        ) : null}
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-medium text-[#173447] sm:truncate">{gpu.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-[#78909c]">
                            {gpu.architecture}
                            {gpu.memorySizeGb ? <span className="sm:hidden">{gpu.architecture ? " · " : ""}{gpu.memorySizeGb}GB {gpu.memoryType}</span> : null}
                          </span>
                        </span>
                      </span>
                      {gpu.memorySizeGb ? (
                        <span className="hidden shrink-0 rounded-full bg-[#edf5f7] px-2 py-1 text-[11px] font-medium text-[#477084] sm:inline">
                          {gpu.memorySizeGb}GB{gpu.memoryType ? ` ${gpu.memoryType}` : ""}
                        </span>
                      ) : null}
                    </ListBox.Item>
                  );
                }}
              </ListBox>
            </Autocomplete.Filter>
            {query.trim() && !items.some((item) => item.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase()) ? (
              <div className="border-t border-[#dce9ee] p-2">
                <Button className="h-auto min-h-9 w-full justify-start whitespace-normal break-all text-left text-xs" variant="tertiary" onPress={() => {
                  setSelectedGpu(null);
                  onChange(query.trim());
                  setIsOpen(false);
                }}>
                  使用自定义型号“{query.trim()}”
                </Button>
              </div>
            ) : null}
          </Autocomplete.Popover>
        </Autocomplete>
      </Field>

      {details.length ? (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#dce9ee]/80 pt-3">
          {details.map(([label, detail]) => (
            <div className="flex items-baseline gap-1.5" key={label}>
              <dt className="text-[11px] text-[#78909c]">{label}</dt>
              <dd className="text-xs font-medium text-[#31566a]">{detail}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function PresetField({
  error,
  id,
  label,
  onChange,
  options,
  placeholder,
  sanitize = (input: string) => input,
  value,
}: {
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  sanitize?: (value: string) => string;
  value: string;
}) {
  const [isCustom, setIsCustom] = useState(Boolean(value && !options.includes(value)));
  const errorId = `${id}-error`;

  return (
    <Field error={error} errorId={errorId} label={label}>
      <Select
        aria-label={label.replace(" *", "")}
        fullWidth
        value={isCustom ? "__custom" : value || "__empty"}
        variant="secondary"
        onChange={(nextValue) => {
          const next = String(nextValue);
          if (next === "__custom") {
            setIsCustom(true);
            onChange("");
            return;
          }
          setIsCustom(false);
          onChange(next);
        }}
      >
        <Select.Trigger
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className={selectTriggerClass(error)}
          id={isCustom ? undefined : id}
        >
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="__empty" isDisabled textValue="请选择">
              请选择
            </ListBox.Item>
            {options.map((option) => (
              <ListBox.Item id={option} key={option} textValue={option}>
                {option}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
            <ListBox.Item id="__custom" textValue="其他规格">
              其他规格
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
      {isCustom ? (
        <Input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoFocus
          className={inputClass(error)}
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(sanitize(event.target.value))}
        />
      ) : null}
    </Field>
  );
}

function Field({children, error, errorId, label}: {children: React.ReactNode; error?: string; errorId?: string; label: string}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[13px] font-medium text-[#24495d]">{label}</Label>
      {children}
      {error ? <p className="text-xs text-[#b54d45]" id={errorId} role="alert">{error}</p> : null}
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
