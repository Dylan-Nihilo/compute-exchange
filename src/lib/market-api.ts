import {z} from "zod";

import {
  filterMarketSupplies,
  marketSupplies,
  paginateMarketSupplies,
  sortMarketSupplies,
  type MarketSort,
  type MarketSupply,
} from "../components/market/market-data.ts";
import {ApiError, type ApiClient} from "./api/client.ts";
import {apiClient} from "./api/configured-client.ts";

const productSchema = z.object({
  id: z.number().int(),
  supplier_id: z.number().int().optional(),
  product_type: z.string(),
  gpu_model: z.string(),
  card_count: z.number().int().nonnegative(),
  machine_count: z.number().int().nonnegative().nullable(),
  rack_count: z.number().int().nonnegative().nullable(),
  memory_spec: z.string(),
  bandwidth_spec: z.string(),
  delivery_mode: z.string(),
  pricing_mode: z.string(),
  unit_price: z.number().int().nonnegative(),
  price_negotiable: z.boolean(),
  available_hours: z.string(),
  stock: z.number().int().nonnegative(),
  region: z.string(),
  total_pflops_approx: z.string().nullable().optional(),
  cpu_spec: z.string().optional(),
  storage_spec: z.string().optional(),
  min_order: z.number().int().positive().optional(),
  min_duration: z.number().int().positive().optional(),
  self_operated: z.boolean().optional(),
});

const productDetailSchema = productSchema.extend({
  supplier_id: z.number().int(),
  total_pflops_approx: z.string().nullable(),
  power_capacity_kw: z.number().int().nonnegative().nullable(),
  cpu_spec: z.string(),
  storage_spec: z.string(),
  available_hours: z.string(),
  min_order: z.number().int().positive(),
  min_duration: z.number().int().positive(),
  status: z.string(),
  self_operated: z.boolean(),
});

const creditSchema = z.object({
  supplier_id: z.number().int(),
  fulfill_rate: z.number(),
  sla_rate: z.number(),
  violation_count: z.number().int().nonnegative(),
  total_orders: z.number().int().nonnegative(),
});

const envelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  data: z.unknown().optional(),
});

const pageSchema = z.object({
  list: z.array(productSchema).nullable(),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
});

const detailSchema = z.object({
  product: productDetailSchema,
  credit: creditSchema.nullable(),
});

const productTypeLabels: Record<string, string> = {
  card_rental: "零租",
  center: "成熟算力中心",
  colocation: "空心机房",
  outright: "零售（买断）",
};

const deliveryModeLabels: Record<string, string> = {
  bare_metal: "裸金属",
  container: "容器",
  rack: "整机柜",
  vm: "虚拟机",
};

const pricingModeLabels: Record<string, string> = {
  daily: "按天",
  hourly: "按小时",
  monthly: "按月",
  perpetual: "买断",
  weekly: "按周",
};

const statusLabels: Record<string, string> = {
  active: "在售",
  offline: "已下架",
  pending: "审核中",
  rejected: "未通过",
  sold_out: "已售罄",
};

const priceSuffixes: Record<string, string> = {
  daily: "天",
  hourly: "小时",
  monthly: "月",
  weekly: "周",
};

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

type ComputeProduct = z.infer<typeof productSchema>;
type ComputeProductDetail = z.infer<typeof productDetailSchema>;

export type MarketQuery = {
  query: string;
  productType: string;
  gpuModel: string;
  region: string;
  deliveryMode: string;
  pricingMode: string;
  availableHours: string;
  priceMin: number | null;
  priceMax: number | null;
  cardCountMin: number | null;
  sort: MarketSort;
  page: number;
  pageSize: number;
};

export type MarketPage = {
  items: MarketSupply[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type MarketSearchParams = Record<
  string,
  string | string[] | undefined
>;

export const defaultMarketQuery: MarketQuery = {
  query: "",
  productType: "card_rental",
  gpuModel: "",
  region: "",
  deliveryMode: "",
  pricingMode: "",
  availableHours: "",
  priceMin: null,
  priceMax: null,
  cardCountMin: null,
  sort: "price_asc",
  page: 1,
  pageSize: 10,
};

const productTypes = ["card_rental", "outright", "center", "colocation"] as const;
const deliveryModes = ["bare_metal", "container", "rack", "vm"] as const;
const pricingModes = ["hourly", "daily", "weekly", "monthly", "perpetual"] as const;
const marketSorts: readonly MarketSort[] = [
  "created_at_desc",
  "price_asc",
  "price_desc",
  "stock_desc",
];
const pageSizes = [10, 20, 50] as const;

export type MarketProductDetail = MarketSupply & {
  supplierId: string;
  productTypeLabel: string;
  cpuSpec: string;
  memorySpec: string;
  storageSpec: string;
  availableHours: string;
  minimumOrder: number;
  minimumDuration: number;
  durationUnit: string;
  status: string;
  statusLabel: string;
  selfOperated: boolean;
  machineCount: number | null;
  rackCount: number | null;
  totalPflopsApprox: string | null;
  powerCapacityKw: number | null;
  credit: {
    fulfillmentRate: number;
    slaRate: number;
    violationCount: number;
    totalOrders: number;
  } | null;
};

export function mapComputeProduct(product: ComputeProduct): MarketSupply {
  const unitLabel =
    product.product_type === "colocation"
      ? "机柜"
      : product.product_type === "center" || product.product_type === "outright"
        ? "台"
        : "GPU";
  const listedUnits =
    unitLabel === "机柜"
      ? product.rack_count
      : unitLabel === "台"
        ? product.machine_count
        : product.card_count;
  const typeLabel = productTypeLabels[product.product_type] ?? "算力供给";
  const specification = [product.gpu_model, product.memory_spec]
    .filter(Boolean)
    .join(" ");
  const priceSuffix = priceSuffixes[product.pricing_mode];

  return {
    id: String(product.id),
    name: specification ? `${specification} ${typeLabel}` : typeLabel,
    gpuModel: product.gpu_model,
    region: product.region,
    totalUnits: Math.max(listedUnits ?? 0, product.stock),
    availableUnits: product.stock,
    unitLabel,
    deliveryMode:
      deliveryModeLabels[product.delivery_mode] ?? "协商交付",
    deliveryModeCode: product.delivery_mode,
    billingMode: pricingModeLabels[product.pricing_mode] ?? product.pricing_mode,
    network: product.bandwidth_spec || "—",
    unitPrice: product.price_negotiable
      ? "面议"
      : currencyFormatter.format(product.unit_price / 100),
    priceUnit:
      product.price_negotiable || !priceSuffix
        ? ""
        : `${unitLabel}·${priceSuffix}`,
    productType: product.product_type,
    pricingMode: product.pricing_mode,
    availableHours: product.available_hours,
    unitPriceMinor: product.price_negotiable ? undefined : product.unit_price,
    cardCount: product.card_count,
    supplierId: product.supplier_id ? String(product.supplier_id) : undefined,
    productTypeLabel: typeLabel,
    cpuSpec: product.cpu_spec,
    memorySpec: product.memory_spec,
    storageSpec: product.storage_spec,
    minimumOrder: product.min_order,
    minimumDuration: product.min_duration,
    selfOperated: product.self_operated,
    totalPflopsApprox: product.total_pflops_approx,
  };
}

function mapComputeProductDetail(
  product: ComputeProductDetail,
  credit: z.infer<typeof creditSchema> | null,
): MarketProductDetail {
  return {
    ...mapComputeProduct(product),
    supplierId: String(product.supplier_id),
    productTypeLabel:
      productTypeLabels[product.product_type] ?? "算力供给",
    cpuSpec: product.cpu_spec,
    memorySpec: product.memory_spec,
    storageSpec: product.storage_spec,
    availableHours: product.available_hours,
    minimumOrder: product.min_order,
    minimumDuration: product.min_duration,
    durationUnit: priceSuffixes[product.pricing_mode] ?? "期",
    status: product.status,
    statusLabel: statusLabels[product.status] ?? "状态待确认",
    selfOperated: product.self_operated,
    machineCount: product.machine_count,
    rackCount: product.rack_count,
    totalPflopsApprox: product.total_pflops_approx,
    powerCapacityKw: product.power_capacity_kw,
    credit: credit
      ? {
          fulfillmentRate: credit.fulfill_rate,
          slaRate: credit.sla_rate,
          violationCount: credit.violation_count,
          totalOrders: credit.total_orders,
        }
      : null,
  };
}

function mapMockProductDetail(supply: MarketSupply): MarketProductDetail {
  return {
    ...supply,
    supplierId: "—",
    productTypeLabel: "按卡租赁",
    cpuSpec: "—",
    memorySpec: "—",
    storageSpec: "—",
    availableHours: "全天",
    minimumOrder: 1,
    minimumDuration: 1,
    durationUnit: supply.billingMode.replace(/^按/, "") || "期",
    status: "active",
    statusLabel: "在售",
    selfOperated: false,
    machineCount: null,
    rackCount: null,
    totalPflopsApprox: null,
    powerCapacityKw: null,
    credit: null,
  };
}

export function parseMarketQuery(params: MarketSearchParams): MarketQuery {
  return {
    query: textParam(params.q),
    productType:
      enumParam(params.product_type, productTypes) ||
      defaultMarketQuery.productType,
    gpuModel: textParam(params.gpu_model),
    region: textParam(params.region),
    deliveryMode: enumParam(params.delivery_mode, deliveryModes),
    pricingMode: enumParam(params.pricing_mode, pricingModes),
    availableHours: textParam(params.available_hours),
    priceMin: decimalParam(params.price_min),
    priceMax: decimalParam(params.price_max),
    cardCountMin: integerParam(params.card_count_min, null),
    sort: enumParam(params.sort, marketSorts) || defaultMarketQuery.sort,
    page: integerParam(params.page, 1) ?? 1,
    pageSize: enumNumberParam(
      params.page_size,
      pageSizes,
      defaultMarketQuery.pageSize,
    ),
  };
}

export function buildMarketHref(query: MarketQuery) {
  const params = new URLSearchParams();
  append(params, "q", query.query);
  if (query.productType !== defaultMarketQuery.productType) {
    append(params, "product_type", query.productType);
  }
  append(params, "gpu_model", query.gpuModel);
  append(params, "region", query.region);
  append(params, "delivery_mode", query.deliveryMode);
  append(params, "pricing_mode", query.pricingMode);
  append(params, "available_hours", query.availableHours);
  append(params, "price_min", query.priceMin);
  append(params, "price_max", query.priceMax);
  append(params, "card_count_min", query.cardCountMin);
  if (query.sort !== defaultMarketQuery.sort) params.set("sort", query.sort);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== defaultMarketQuery.pageSize) {
    params.set("page_size", String(query.pageSize));
  }
  const search = params.toString();
  return search ? `/market?${search}` : "/market";
}

export async function getMarketSupplies(
  query: MarketQuery = defaultMarketQuery,
  client: ApiClient | null = apiClient,
): Promise<MarketPage> {
  if (!client) {
    const filtered = filterMarketSupplies(marketSupplies, query);
    const sorted = sortMarketSupplies(filtered, query.sort);
    const paginated = paginateMarketSupplies(sorted, query.page, query.pageSize);
    return {
      items: paginated.items,
      total: filtered.length,
      page: paginated.page,
      pageSize: query.pageSize,
      totalPages: paginated.totalPages,
    };
  }

  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.pageSize),
    sort: query.sort,
  });
  append(params, "q", query.query);
  append(params, "product_type", query.productType);
  append(params, "gpu_model", query.gpuModel);
  append(params, "region", query.region);
  append(params, "delivery_mode", query.deliveryMode);
  append(params, "pricing_mode", query.pricingMode);
  append(params, "available_hours", query.availableHours);
  append(params, "price_min", toMinorUnits(query.priceMin));
  append(params, "price_max", toMinorUnits(query.priceMax));
  append(params, "card_count_min", query.cardCountMin);

  const response = await client.request(
    `/products?${params.toString()}`,
    envelopeSchema,
    {cache: "no-store"},
  );
  if (response.code !== 0) {
    throw new ApiError(response.message, {
      code: String(response.code),
      details: response.data,
      status: 502,
    });
  }

  const page = pageSchema.parse(response.data);
  return {
    items: (page.list ?? []).map(mapComputeProduct),
    total: page.total,
    page: page.page,
    pageSize: page.page_size,
    totalPages: Math.max(1, Math.ceil(page.total / page.page_size)),
  };
}

export async function getMarketProduct(
  productId: string,
  client: ApiClient | null = apiClient,
): Promise<MarketProductDetail | null> {
  if (!client) {
    const product = marketSupplies.find(({id}) => id === productId);
    return product ? mapMockProductDetail(product) : null;
  }
  if (!/^[1-9]\d*$/.test(productId)) return null;

  const response = await client.request(
    `/products/${productId}`,
    envelopeSchema,
    {cache: "no-store"},
  );
  if (response.code === 40400) return null;
  if (response.code !== 0) {
    throw new ApiError(response.message, {
      code: String(response.code),
      details: response.data,
      status: 502,
    });
  }

  const detail = detailSchema.parse(response.data);
  return mapComputeProductDetail(detail.product, detail.credit);
}

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

function integerParam(
  value: string | string[] | undefined,
  fallback: number | null,
) {
  const item = firstParam(value)?.trim();
  if (!item || !/^\d+$/.test(item)) return fallback;
  const number = Number(item);
  return Number.isSafeInteger(number) && number > 0
    ? Math.min(number, 1_000_000)
    : fallback;
}

function enumNumberParam<const T extends number>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  const number = integerParam(value, fallback) ?? fallback;
  return allowed.includes(number as T) ? (number as T) : fallback;
}

function append(
  params: URLSearchParams,
  name: string,
  value: string | number | null,
) {
  if (value !== "" && value !== null) params.set(name, String(value));
}

function toMinorUnits(value: number | null) {
  return value === null ? null : Math.round(value * 100);
}
