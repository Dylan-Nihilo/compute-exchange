import {z} from "zod";

// 与后端 internal/equipment/handler.go 的线格式对齐:
// 买家侧(buyerProductJSON)不含 vendor_id, 只有脱敏后的 vendor_name;
// 供应方/运营侧(vendorProductJSON)含 vendor_id 与 rejected_reason —— 因此这三个字段均为可选。
export const equipmentWireSchema = z.object({
  id: z.number().int(),
  vendor_id: z.number().int().optional(),
  /** 买家侧脱敏企业名, 如 "北京***有限公司"; 无认证企业时为空串 */
  vendor_name: z.string().optional(),
  title: z.string(),
  equipment_type: z.string(),
  brand: z.string(),
  model: z.string(),
  condition_type: z.enum(["new", "used"]),
  manufacture_year: z.number().int().nullable(),
  usage_desc: z.string(),
  quantity: z.number().int().nonnegative(),
  unit_price: z.number().int().nonnegative(),
  price_negotiable: z.boolean(),
  region: z.string(),
  description: z.string(),
  images: z.array(z.string()).nullable(),
  status: z.string(),
  rejected_reason: z.string().optional(),
  created_at: z.string(),
});

const envelopeSchema = z.object({
  code: z.number().int(),
  message: z.string().optional(),
  data: z.unknown().optional(),
});

const pageSchema = z.object({
  list: z.array(equipmentWireSchema).nullable(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
});

export const equipmentTypeLabels: Record<string, string> = {
  gpu_server: "GPU 服务器",
  storage: "存储",
  network: "网络",
  cooling: "制冷",
  ups: "UPS",
  rack: "机柜",
  other: "其他",
};

export const equipmentConditionLabels: Record<string, string> = {
  new: "一手 · 全新",
  used: "二手",
};

export const equipmentStatusLabels: Record<string, string> = {
  draft: "草稿/已驳回",
  pending: "审核中",
  active: "在售",
  sold_out: "已售罄",
  offline: "已下架",
};

const unitLabels: Record<string, string> = {
  gpu_server: "台",
  storage: "台",
  network: "台",
  cooling: "台",
  ups: "台",
  rack: "个",
  other: "件",
};

export const equipmentTypes = [
  "gpu_server",
  "storage",
  "network",
  "cooling",
  "ups",
  "rack",
  "other",
] as const;
const conditionTypes = ["new", "used"] as const;
export const equipmentSorts = ["created_at_desc", "price_asc", "price_desc"] as const;
export type EquipmentSort = (typeof equipmentSorts)[number];
const pageSizes = [12, 24, 48] as const;

export type EquipmentWire = z.infer<typeof equipmentWireSchema>;

export type EquipmentItem = {
  id: string;
  title: string;
  equipmentType: string;
  typeLabel: string;
  brand: string;
  model: string;
  condition: "new" | "used";
  conditionLabel: string;
  manufactureYear: number | null;
  usageDesc: string;
  quantity: number;
  unitLabel: string;
  region: string;
  description: string;
  /** 面议时为 "面议"，否则如 "¥248万" / "¥1,800" */
  priceLabel: string;
  priceNegotiable: boolean;
  unitPriceMinor?: number;
  status: string;
  statusLabel: string;
  createdAt: string;
  /** 买家侧脱敏供应方名(北京***有限公司); 无认证企业时为 undefined */
  supplierName?: string;
  /** 仅供应方/运营视角存在 */
  rejectedReason?: string;
};

export type EquipmentQuery = {
  equipmentType: string;
  conditionType: string;
  region: string;
  /** 单位: 万元(与线稿一致); 请求时转换为分 */
  priceMinWan: number | null;
  priceMaxWan: number | null;
  sort: EquipmentSort;
  page: number;
  pageSize: number;
};

export type EquipmentMarketPage = {
  items: EquipmentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type EquipmentSearchParams = Record<string, string | string[] | undefined>;

export const defaultEquipmentQuery: EquipmentQuery = {
  equipmentType: "",
  conditionType: "",
  region: "",
  priceMinWan: null,
  priceMaxWan: null,
  sort: "created_at_desc",
  page: 1,
  pageSize: 12,
};

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 0,
  style: "currency",
});

export function formatEquipmentPrice(unitPriceMinor: number, negotiable: boolean) {
  if (negotiable) return "面议";
  // 1 万元 = 1_000_000 分; 大额设备按「万」展示, 与线稿一致
  if (unitPriceMinor >= 1_000_000) {
    const wan = unitPriceMinor / 1_000_000;
    const rounded = Math.round(wan * 10) / 10;
    return `¥${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded}万`;
  }
  return currencyFormatter.format(unitPriceMinor / 100);
}

export function mapEquipmentProduct(product: EquipmentWire): EquipmentItem {
  return {
    id: String(product.id),
    title: product.title,
    equipmentType: product.equipment_type,
    typeLabel: equipmentTypeLabels[product.equipment_type] ?? "设备",
    brand: product.brand,
    model: product.model,
    condition: product.condition_type,
    conditionLabel: equipmentConditionLabels[product.condition_type] ?? product.condition_type,
    manufactureYear: product.manufacture_year,
    usageDesc: product.usage_desc,
    quantity: product.quantity,
    unitLabel: unitLabels[product.equipment_type] ?? "件",
    region: product.region,
    description: product.description,
    priceLabel: formatEquipmentPrice(product.unit_price, product.price_negotiable),
    priceNegotiable: product.price_negotiable,
    ...(product.price_negotiable ? {} : {unitPriceMinor: product.unit_price}),
    status: product.status,
    statusLabel: equipmentStatusLabels[product.status] ?? product.status,
    createdAt: product.created_at,
    ...(product.vendor_name ? {supplierName: product.vendor_name} : {}),
    ...(product.rejected_reason ? {rejectedReason: product.rejected_reason} : {}),
  };
}

export function parseEquipmentQuery(params: EquipmentSearchParams): EquipmentQuery {
  return {
    equipmentType: enumParam(params.equipment_type, equipmentTypes),
    conditionType: enumParam(params.condition_type, conditionTypes),
    region: textParam(params.region),
    priceMinWan: decimalParam(params.price_min_wan),
    priceMaxWan: decimalParam(params.price_max_wan),
    sort: enumParam(params.sort, equipmentSorts) || defaultEquipmentQuery.sort,
    page: integerParam(params.page, 1) ?? 1,
    pageSize: enumNumberParam(params.page_size, pageSizes, defaultEquipmentQuery.pageSize),
  };
}

export function buildEquipmentMarketHref(query: EquipmentQuery) {
  const params = new URLSearchParams();
  append(params, "equipment_type", query.equipmentType);
  append(params, "condition_type", query.conditionType);
  append(params, "region", query.region);
  append(params, "price_min_wan", query.priceMinWan);
  append(params, "price_max_wan", query.priceMaxWan);
  if (query.sort !== defaultEquipmentQuery.sort) params.set("sort", query.sort);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== defaultEquipmentQuery.pageSize) {
    params.set("page_size", String(query.pageSize));
  }
  const search = params.toString();
  return search ? `/equipment-market?${search}` : "/equipment-market";
}

// fetchEquipmentMarket 设备市场列表: 浏览需登录, 经 BFF(/api/equipments)换 Bearer 代理,
// 令牌过期由 BFF 自动 refresh —— 因此在客户端(useQuery)取数, 不做 SSR 直连。
export async function fetchEquipmentMarket(
  query: EquipmentQuery = defaultEquipmentQuery,
  fetchImplementation: typeof fetch = fetch,
): Promise<EquipmentMarketPage> {
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
    sort: query.sort,
  });
  append(params, "equipment_type", query.equipmentType);
  append(params, "condition_type", query.conditionType);
  append(params, "region", query.region);
  append(params, "price_min", wanToMinor(query.priceMinWan));
  append(params, "price_max", wanToMinor(query.priceMaxWan));

  let response: Response;
  try {
    response = await fetchImplementation(`/api/equipments?${params.toString()}`, {cache: "no-store"});
  } catch {
    throw new Error("设备市场服务暂不可用");
  }
  const parsed = envelopeSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("设备市场服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) {
    throw new Error(parsed.data.message || "设备列表读取失败");
  }

  const page = pageSchema.parse(parsed.data.data);
  return {
    items: (page.list ?? []).map(mapEquipmentProduct),
    total: page.total,
    page: page.page,
    pageSize: page.page_size,
    totalPages: Math.max(1, Math.ceil(page.total / page.page_size)),
  };
}

// ===== 询价(走 BFF, 需登录) =====

export type EquipmentInquiryInput = {
  quantity: number;
  contact_name: string;
  contact_phone: string;
  message: string;
};

export async function submitEquipmentInquiry(
  equipmentId: string,
  input: EquipmentInquiryInput,
  fetchImplementation: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetchImplementation(
      `/api/equipments/${encodeURIComponent(equipmentId)}/inquiries`,
      {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(input)},
    );
  } catch {
    throw new Error("询价服务暂不可用");
  }
  const parsed = envelopeSchema
    .extend({data: z.object({id: z.number().int().positive(), note: z.string().optional()}).optional()})
    .safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("询价服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) {
    throw new Error(parsed.data.message || "询价提交失败");
  }
  return parsed.data.data;
}

// ===== param helpers(与 market-api 同口径) =====

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function textParam(value: string | string[] | undefined) {
  return (firstParam(value) ?? "").trim().slice(0, 100);
}

function enumParam<const T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
) {
  const item = firstParam(value) ?? "";
  return allowed.includes(item as T) ? (item as T) : "";
}

function decimalParam(value: string | string[] | undefined) {
  const item = firstParam(value)?.trim();
  if (!item || !/^\d+(?:\.\d{1,2})?$/.test(item)) return null;
  const number = Number(item);
  return Number.isSafeInteger(Math.round(number * 100)) ? number : null;
}

function integerParam(value: string | string[] | undefined, fallback: number | null) {
  const item = firstParam(value)?.trim();
  if (!item || !/^\d+$/.test(item)) return fallback;
  const number = Number(item);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, 1_000_000) : fallback;
}

function enumNumberParam<const T extends number>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  const number = integerParam(value, fallback) ?? fallback;
  return allowed.includes(number as T) ? (number as T) : fallback;
}

function append(params: URLSearchParams, name: string, value: string | number | null) {
  if (value !== "" && value !== null) params.set(name, String(value));
}

/** 万元 → 分。设备价格以万元为输入单位(线稿口径)。 */
function wanToMinor(value: number | null) {
  return value === null ? null : Math.round(value * 1_000_000);
}

/** "50-300" / "50" / "-300"(万元, 容忍 ¥/万/元/空格) → {priceMinWan, priceMaxWan}; 非法输入返回 null。 */
export function parseWanRange(raw: string): {priceMinWan: number | null; priceMaxWan: number | null} | null {
  const text = raw.trim().replace(/[¥￥万元\s]/g, "");
  if (!text) return {priceMinWan: null, priceMaxWan: null};
  const match = /^(\d+(?:\.\d{1,2})?)?(?:[-–~至](\d+(?:\.\d{1,2})?)?)?$/.exec(text);
  if (!match || (!match[1] && !match[2])) return null;
  const min = match[1] ? Number(match[1]) : null;
  const max = match[2] ? Number(match[2]) : null;
  if (min !== null && max !== null && min > max) return null;
  return {priceMinWan: min, priceMaxWan: max};
}

export function formatWanRange(min: number | null, max: number | null) {
  if (min === null && max === null) return "";
  return `${min ?? ""}-${max ?? ""}`;
}
