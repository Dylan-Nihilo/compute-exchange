export type MarketSupply = {
  id: string;
  name: string;
  gpuModel: string;
  region: string;
  totalUnits: number;
  availableUnits: number;
  unitLabel?: string;
  deliveryMode: string;
  deliveryModeCode?: string;
  billingMode: string;
  network: string;
  unitPrice: string;
  priceUnit: string;
  productType?: string;
  pricingMode?: string;
  availableHours?: string;
  unitPriceMinor?: number;
  cardCount?: number;
  supplierId?: string;
  productTypeLabel?: string;
  cpuSpec?: string;
  memorySpec?: string;
  storageSpec?: string;
  minimumOrder?: number;
  minimumDuration?: number;
  selfOperated?: boolean;
  totalPflopsApprox?: string | null;
};

export type MarketFilters = {
  query: string;
  gpuModel: string;
  region: string;
  deliveryMode: string;
  productType: string;
  pricingMode: string;
  availableHours: string;
  priceMin: number | null;
  priceMax: number | null;
  cardCountMin: number | null;
};

export type MarketSort =
  | "created_at_desc"
  | "price_asc"
  | "price_desc"
  | "stock_desc";

export function parseMarketPriceRange(value: string) {
  const normalized = value
    .trim()
    .replace(/[¥￥,\s]/g, "")
    .replace(/\/.+$/, "");
  if (!normalized) return {priceMin: null, priceMax: null};

  const match = normalized.match(
    /^(\d+(?:\.\d{1,2})?)?[-–—~至](\d+(?:\.\d{1,2})?)?$/,
  );
  if (!match || (!match[1] && !match[2])) return null;

  const priceMin = match[1] ? Number(match[1]) : null;
  const priceMax = match[2] ? Number(match[2]) : null;
  if (
    (priceMin !== null && !Number.isSafeInteger(Math.round(priceMin * 100))) ||
    (priceMax !== null && !Number.isSafeInteger(Math.round(priceMax * 100))) ||
    (priceMin !== null && priceMax !== null && priceMin > priceMax)
  ) {
    return null;
  }
  return {priceMin, priceMax};
}

export function formatMarketPriceRange(
  priceMin: number | null,
  priceMax: number | null,
) {
  if (priceMin === null && priceMax === null) return "";
  return `¥${priceMin ?? ""}–${priceMax ?? ""}`;
}

export const marketSupplies: readonly MarketSupply[] = [
  {
    id: "supply-h100-64",
    name: "H100 SXM 80GB 训练集群",
    gpuModel: "H100",
    region: "乌兰察布",
    totalUnits: 64,
    availableUnits: 48,
    deliveryMode: "容器",
    billingMode: "按小时",
    network: "100 Gbps",
    unitPrice: "¥18.60",
    priceUnit: "GPU·小时",
  },
  {
    id: "supply-h20-128",
    name: "H20 96GB 推理集群",
    gpuModel: "H20",
    region: "中卫",
    totalUnits: 128,
    availableUnits: 96,
    deliveryMode: "虚拟机",
    billingMode: "按小时",
    network: "50 Gbps",
    unitPrice: "¥9.80",
    priceUnit: "GPU·小时",
  },
  {
    id: "supply-a800-32",
    name: "A800 80GB 训练资源",
    gpuModel: "A800",
    region: "上海",
    totalUnits: 32,
    availableUnits: 12,
    deliveryMode: "裸金属",
    billingMode: "按月",
    network: "25 Gbps",
    unitPrice: "¥6,980",
    priceUnit: "GPU·月",
  },
  {
    id: "supply-h200-16",
    name: "H200 SXM 141GB 高速集群",
    gpuModel: "H200",
    region: "杭州",
    totalUnits: 16,
    availableUnits: 8,
    deliveryMode: "容器",
    billingMode: "按小时",
    network: "200 Gbps",
    unitPrice: "¥31.20",
    priceUnit: "GPU·小时",
  },
  {
    id: "supply-a100-48",
    name: "A100 SXM 80GB 通用训练集群",
    gpuModel: "A100",
    region: "深圳",
    totalUnits: 48,
    availableUnits: 28,
    deliveryMode: "裸金属",
    billingMode: "按周",
    network: "100 Gbps",
    unitPrice: "¥2,860",
    priceUnit: "GPU·周",
  },
  {
    id: "supply-l40s-32",
    name: "L40S 48GB 推理资源池",
    gpuModel: "L40S",
    region: "北京",
    totalUnits: 32,
    availableUnits: 24,
    deliveryMode: "虚拟机",
    billingMode: "按小时",
    network: "25 Gbps",
    unitPrice: "¥7.60",
    priceUnit: "GPU·小时",
  },
  {
    id: "supply-4090-24",
    name: "RTX 4090 24GB 渲染与推理集群",
    gpuModel: "RTX 4090",
    region: "成都",
    totalUnits: 24,
    availableUnits: 20,
    deliveryMode: "容器",
    billingMode: "按小时",
    network: "10 Gbps",
    unitPrice: "¥3.90",
    priceUnit: "GPU·小时",
  },
  {
    id: "supply-h800-64",
    name: "H800 80GB 整机柜资源",
    gpuModel: "H800",
    region: "贵阳",
    totalUnits: 64,
    availableUnits: 16,
    deliveryMode: "整机柜",
    billingMode: "按月",
    network: "100 Gbps",
    unitPrice: "¥392,000",
    priceUnit: "机柜·月",
  },
  {
    id: "supply-a100-16",
    name: "A100 PCIe 80GB 推理节点",
    gpuModel: "A100",
    region: "广州",
    totalUnits: 16,
    availableUnits: 10,
    deliveryMode: "虚拟机",
    billingMode: "按小时",
    network: "25 Gbps",
    unitPrice: "¥11.80",
    priceUnit: "GPU·小时",
  },
  {
    id: "supply-l20-80",
    name: "L20 48GB 弹性推理集群",
    gpuModel: "L20",
    region: "南京",
    totalUnits: 80,
    availableUnits: 64,
    deliveryMode: "容器",
    billingMode: "按小时",
    network: "50 Gbps",
    unitPrice: "¥5.20",
    priceUnit: "GPU·小时",
  },
  {
    id: "supply-h100-8",
    name: "H100 NVL 94GB 独享节点",
    gpuModel: "H100",
    region: "深圳",
    totalUnits: 8,
    availableUnits: 4,
    deliveryMode: "裸金属",
    billingMode: "按月",
    network: "100 Gbps",
    unitPrice: "¥14,800",
    priceUnit: "GPU·月",
  },
  {
    id: "supply-h20-96",
    name: "H20 96GB 整机柜推理资源",
    gpuModel: "H20",
    region: "北京",
    totalUnits: 96,
    availableUnits: 32,
    deliveryMode: "整机柜",
    billingMode: "按月",
    network: "100 Gbps",
    unitPrice: "¥318,000",
    priceUnit: "机柜·月",
  },
];

export function filterMarketSupplies(
  supplies: readonly MarketSupply[],
  filters: MarketFilters,
): MarketSupply[] {
  const query = filters.query.trim().toLocaleLowerCase("zh-CN");

  return supplies.filter((supply) => {
    const productType = supply.productType ?? "card_rental";
    const pricingMode = supply.pricingMode ?? pricingModeFor(supply.billingMode);
    const availableHours = supply.availableHours ?? "全天 24h";
    const unitPriceMinor = supply.unitPriceMinor ?? priceMinorFor(supply.unitPrice);
    const cardCount = supply.cardCount ?? supply.totalUnits;
    const matchesQuery =
      !query ||
      [
        supply.name,
        supply.gpuModel,
        supply.region,
        supply.deliveryMode,
        supply.billingMode,
        supply.network,
      ].some((value) => value.toLocaleLowerCase("zh-CN").includes(query));

    return (
      matchesQuery &&
      (!filters.gpuModel || supply.gpuModel === filters.gpuModel) &&
      (!filters.region || supply.region === filters.region) &&
      (!filters.deliveryMode ||
        (supply.deliveryModeCode ?? deliveryModeFor(supply.deliveryMode)) ===
          filters.deliveryMode) &&
      (!filters.productType || productType === filters.productType) &&
      (!filters.pricingMode || pricingMode === filters.pricingMode) &&
      (!filters.availableHours ||
        availableHours.includes(filters.availableHours)) &&
      (filters.priceMin === null ||
        (unitPriceMinor !== null && unitPriceMinor >= filters.priceMin * 100)) &&
      (filters.priceMax === null ||
        (unitPriceMinor !== null && unitPriceMinor <= filters.priceMax * 100)) &&
      (filters.cardCountMin === null || cardCount >= filters.cardCountMin)
    );
  });
}

export function sortMarketSupplies(
  supplies: readonly MarketSupply[],
  sort: MarketSort,
): MarketSupply[] {
  if (sort === "created_at_desc") return [...supplies];

  return supplies
    .map((supply, index) => ({index, supply}))
    .sort((left, right) => {
      const difference =
        sort === "stock_desc"
          ? right.supply.availableUnits - left.supply.availableUnits
          : comparePrices(left.supply, right.supply, sort === "price_asc");
      return difference || left.index - right.index;
    })
    .map(({supply}) => supply);
}

export function paginateMarketSupplies(
  supplies: readonly MarketSupply[],
  requestedPage: number,
  pageSize: number,
) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("Page size must be a positive integer");
  }

  const totalPages = Math.max(1, Math.ceil(supplies.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: supplies.slice(start, start + pageSize),
    page,
    totalPages,
  };
}

export function marketPaginationItems(
  page: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({length: totalPages}, (_, index) => index + 1);
  }

  const visible = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);
  return visible.flatMap((item, index) => {
    const previous = visible[index - 1];
    return previous && item - previous > 1
      ? ["ellipsis" as const, item]
      : [item];
  });
}

function pricingModeFor(billingMode: string) {
  return (
    {
      按小时: "hourly",
      按天: "daily",
      按周: "weekly",
      按月: "monthly",
      买断: "perpetual",
    }[billingMode] ?? ""
  );
}

function deliveryModeFor(deliveryMode: string) {
  return (
    {
      容器: "container",
      虚拟机: "vm",
      裸金属: "bare_metal",
      整机柜: "rack",
    }[deliveryMode] ?? ""
  );
}

function priceMinorFor(displayPrice: string) {
  const value = Number(displayPrice.replace(/[¥,]/g, ""));
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function comparePrices(
  left: MarketSupply,
  right: MarketSupply,
  ascending: boolean,
) {
  const leftPrice = left.unitPriceMinor ?? priceMinorFor(left.unitPrice);
  const rightPrice = right.unitPriceMinor ?? priceMinorFor(right.unitPrice);
  if (leftPrice === null) return rightPrice === null ? 0 : 1;
  if (rightPrice === null) return -1;
  return ascending ? leftPrice - rightPrice : rightPrice - leftPrice;
}
