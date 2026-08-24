"use client";

import {
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  NumberField,
  Pagination,
  SearchField,
  Select,
  Spinner,
  TextField,
} from "@heroui/react";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {type FormEvent, type ReactNode, useState, useTransition} from "react";

import {MarketBrowser} from "@/components/market/market-browser";
import {
  AnimatedNumber,
  AnimatedNumberGroup,
} from "@/components/system/animated-number";
import {
  formatMarketPriceRange,
  marketPaginationItems,
  parseMarketPriceRange,
} from "@/components/market/market-data";
import {
  buildMarketHref,
  defaultMarketQuery,
  type MarketPage,
  type MarketQuery,
} from "@/lib/market-api";

type MarketViewProps = {
  query: MarketQuery;
  result: MarketPage;
};

type FilterOption = {label: string; value: string};

const productTypeOptions: readonly FilterOption[] = [
  {label: "零租", value: "card_rental"},
  {label: "零售（买断）", value: "outright"},
  {label: "成熟算力中心", value: "center"},
  {label: "空心机房", value: "colocation"},
];
const productTypeDescriptions: Record<string, string> = {
  card_rental: "零租：按卡租用，支持时 / 天 / 周计费。",
  center: "成熟算力中心：整机或集群资源，适合稳定规模化部署。",
  colocation: "空心机房：按机柜提供空间、电力与网络条件。",
  outright: "零售（买断）：设备一次性采购，具体交付条件以商品为准。",
};
const gpuOptions: readonly FilterOption[] = [
  {label: "NVIDIA H100", value: "NVIDIA H100"},
  {label: "NVIDIA H800", value: "NVIDIA H800"},
  {label: "NVIDIA A800", value: "NVIDIA A800"},
  {label: "NVIDIA RTX 4090", value: "NVIDIA RTX 4090"},
  {label: "NVIDIA RTX 5090", value: "NVIDIA RTX 5090"},
];
const regionOptions: readonly FilterOption[] = [
  {label: "北京", value: "北京"},
  {label: "上海", value: "上海"},
  {label: "深圳", value: "深圳"},
  {label: "成都", value: "成都"},
  {label: "乌兰察布", value: "乌兰察布"},
  {label: "张家口", value: "张家口"},
];
const pricingModeOptions: readonly FilterOption[] = [
  {label: "按小时", value: "hourly"},
  {label: "按天", value: "daily"},
  {label: "按周", value: "weekly"},
  {label: "按月", value: "monthly"},
  {label: "买断", value: "perpetual"},
];
const deliveryModeOptions: readonly FilterOption[] = [
  {label: "裸金属", value: "bare_metal"},
  {label: "容器", value: "container"},
  {label: "虚拟机", value: "vm"},
  {label: "整机柜", value: "rack"},
];
const sortOptions: readonly FilterOption[] = [
  {label: "最新上架", value: "created_at_desc"},
  {label: "价格从低到高", value: "price_asc"},
  {label: "价格从高到低", value: "price_desc"},
  {label: "算力规模", value: "stock_desc"},
];
const pageSizeOptions: readonly FilterOption[] = [
  {label: "每页 10 条", value: "10"},
  {label: "每页 20 条", value: "20"},
  {label: "每页 50 条", value: "50"},
];

export function MarketView({query, result}: MarketViewProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(query);
  const [priceRange, setPriceRange] = useState(
    formatMarketPriceRange(query.priceMin, query.priceMax),
  );
  const [isPending, startTransition] = useTransition();
  const hasFilters = buildMarketHref({...query, page: 1}) !== "/market";
  const hasAdvancedFilters = Boolean(
    query.query ||
      query.deliveryMode ||
      query.availableHours ||
      query.cardCountMin !== null,
  );
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedFilters);
  const parsedPriceRange = parseMarketPriceRange(priceRange);
  const priceRangeInvalid = parsedPriceRange === null;
  const startItem = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const endItem = Math.min(result.page * result.pageSize, result.total);
  const activeFilters = getActiveFilters(query);

  const navigate = (nextQuery: MarketQuery) => {
    startTransition(() => router.push(buildMarketHref(nextQuery)));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parsedPriceRange) return;
    navigate({...draft, ...parsedPriceRange, page: 1});
  };
  const changeSort = (sort: MarketQuery["sort"]) =>
    navigate({...query, sort, page: 1});

  return (
    <main className="omnis-workbench-controls relative min-h-svh overflow-hidden pb-10 pt-12 text-[#102b3b] sm:pt-16">
      <div
        aria-busy={isPending}
        className={`relative mx-auto w-full max-w-[1408px] px-4 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none sm:px-8 lg:px-16 ${
          isPending ? "translate-y-px opacity-80" : ""
        }`}
      >
        <header className="mb-5">
          <h1 className="text-[36px] leading-tight font-semibold tracking-[-0.03em] text-[#071627] sm:text-[44px] sm:leading-[56px]">
            算力市场
          </h1>
          <p className="mt-1 text-sm leading-[22px] text-[#4b6276] sm:text-base">
            合规机房挂牌 · 实时比价 · 线上成交
          </p>
        </header>

        <section
          aria-label="算力商品类型"
          className="rounded-[20px] border border-[#171e1c]/3 bg-white/70 p-3 backdrop-blur-xl"
        >
          <div className="flex items-center gap-2.5 overflow-x-auto">
            {productTypeOptions.map((option) => {
              const selected = query.productType === option.value;
              return (
                <Button
                  className={
                    selected
                      ? "h-12 min-w-40 shrink-0 rounded-[14px] border border-[#9fc4d2]/50 bg-[#e2f1f6] text-[#15384d] shadow-[0_4px_5px_rgba(71,123,145,0.1)]"
                      : "h-12 min-w-40 shrink-0 rounded-[14px] bg-white/70 text-[#496777]"
                  }
                  key={option.value}
                  onPress={() =>
                    navigate({...query, productType: option.value, page: 1})
                  }
                  variant="ghost"
                >
                  {option.label}
                </Button>
              );
            })}
            <p className="hidden min-w-80 flex-1 px-1 text-sm leading-[22px] text-[#496777] lg:block">
              {productTypeDescriptions[query.productType]}
            </p>
          </div>
        </section>

        <form
          aria-label="市场筛选"
          className="mt-5 rounded-[20px] border border-[#171e1c]/2 bg-white/75 px-4 py-3 backdrop-blur-xl sm:px-6"
          onSubmit={submit}
        >
          <div className="grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[252px_204px_204px_minmax(260px,1fr)_108px]">
            <FilterSelect
              allLabel="全部型号"
              ariaLabel="按 GPU 型号筛选"
              label="GPU 型号"
              options={gpuOptions}
              value={draft.gpuModel}
              onChange={(value) =>
                setDraft((current) => ({...current, gpuModel: value}))
              }
            />
            <FilterSelect
              allLabel="全部"
              ariaLabel="按地域筛选"
              label="地域"
              options={regionOptions}
              value={draft.region}
              onChange={(value) =>
                setDraft((current) => ({...current, region: value}))
              }
            />
            <FilterSelect
              allLabel="全部"
              ariaLabel="按计费模式筛选"
              label="计费模式"
              options={pricingModeOptions}
              value={draft.pricingMode}
              onChange={(value) =>
                setDraft((current) => ({...current, pricingMode: value}))
              }
            />
            <TextField
              fullWidth
              aria-label="价格区间"
              className="gap-2"
              isInvalid={priceRangeInvalid}
              value={priceRange}
              variant="secondary"
              onChange={setPriceRange}
            >
              <Label className="text-[13px] font-medium text-[#24495d]">
                价格区间
              </Label>
              <Input
                className="h-11 rounded-[14px] border border-[#afc4ce]/45 bg-white/90 px-3 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)]"
                placeholder="价格区间，如 ¥20–50 / 卡·时"
              />
            </TextField>
            <Button
              className="h-11 w-full rounded-[14px] border border-[#9eb9c5]/60 bg-[#e8f1f4] text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)]"
              isPending={isPending}
              type="submit"
            >
              {isPending ? (
                <>
                  <Spinner aria-hidden="true" color="current" size="sm" />
                  筛选中
                </>
              ) : (
                "筛选"
              )}
            </Button>
          </div>

          {priceRangeInvalid ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              请输入有效价格区间，例如 20–50。
            </p>
          ) : null}

          <div className="mt-2 flex min-h-9 flex-wrap items-center gap-2.5">
            <span className="mr-1 text-[13px] text-[#5f7888]">排序</span>
            <SortButton
              isSelected={query.sort === "price_asc" || query.sort === "price_desc"}
              onPress={() =>
                changeSort(query.sort === "price_asc" ? "price_desc" : "price_asc")
              }
            >
              价格
              <Image
                alt=""
                aria-hidden="true"
                height={16}
                src="/market/sort-price.svg"
                unoptimized
                width={16}
              />
            </SortButton>
            <SortButton
              isSelected={query.sort === "stock_desc"}
              onPress={() => changeSort("stock_desc")}
            >
              算力规模
            </SortButton>
            <SortButton isDisabled isSelected={false} onPress={() => undefined}>
              信用分
            </SortButton>
            <SortButton
              isSelected={query.sort === "created_at_desc"}
              onPress={() => changeSort("created_at_desc")}
            >
              最新上架
            </SortButton>
            <Button
              className="ml-1 h-9 px-2 text-[13px] font-medium text-[#496877]"
              size="sm"
              variant="ghost"
              onPress={() => setAdvancedOpen((open) => !open)}
            >
              更多筛选
            </Button>
            <span aria-live="polite" className="ml-auto text-[13px] font-medium text-[#496877]">
              共 <AnimatedNumber value={result.total} /> 个商品
            </span>
          </div>

          {advancedOpen ? (
            <div className="mt-3 grid gap-3 border-t border-white/70 pt-4 sm:grid-cols-2 xl:grid-cols-[1.35fr_repeat(3,minmax(0,1fr))]">
              <SearchField
                fullWidth
                aria-label="搜索算力供给"
                value={draft.query}
                variant="secondary"
                onChange={(value) =>
                  setDraft((current) => ({...current, query: value}))
                }
              >
                <SearchField.Group className="h-11 rounded-[14px] border-[#afc4ce]/45 bg-white/90">
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="搜索规格、地域或时段" />
                  <SearchField.ClearButton aria-label="清除搜索内容" />
                </SearchField.Group>
              </SearchField>
              <FilterSelect
                allLabel="全部交付方式"
                ariaLabel="按交付方式筛选"
                options={deliveryModeOptions}
                value={draft.deliveryMode}
                onChange={(value) =>
                  setDraft((current) => ({...current, deliveryMode: value}))
                }
              />
              <TextField
                fullWidth
                aria-label="按可售时段筛选"
                value={draft.availableHours}
                variant="secondary"
                onChange={(value) =>
                  setDraft((current) => ({...current, availableHours: value}))
                }
              >
                <Input
                  className="h-11 rounded-[14px] border border-[#afc4ce]/45 bg-white/90"
                  placeholder="可售时段，如夜间"
                />
              </TextField>
              <FilterNumberField
                ariaLabel="最少卡数"
                placeholder="最少卡数"
                value={draft.cardCountMin}
                onChange={(value) =>
                  setDraft((current) => ({...current, cardCountMin: value}))
                }
              />
            </div>
          ) : null}

          {activeFilters.length || hasFilters ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeFilters.map((filter) => (
                <Chip className="bg-[#e3f0f4] text-[#24546b]" key={filter} size="sm" variant="soft">
                  {filter}
                </Chip>
              ))}
              <Button
                className="ml-auto"
                isDisabled={!hasFilters || isPending}
                size="sm"
                variant="ghost"
                onPress={() => navigate(defaultMarketQuery)}
              >
                重置
              </Button>
            </div>
          ) : null}
        </form>

        <section aria-label="算力供给列表" className="mt-6">
          <MarketBrowser supplies={result.items} />

          <Pagination
            aria-label="算力商品分页"
            className="mt-6 w-full flex-wrap justify-between gap-3 rounded-[18px] border border-white/70 bg-white/75 px-4 py-2.5 backdrop-blur-xl"
          >
            <Pagination.Summary>
              <AnimatedNumberGroup>
                显示 <AnimatedNumber value={startItem} />–<AnimatedNumber value={endItem} />，共 <AnimatedNumber value={result.total} /> 条
              </AnimatedNumberGroup>
            </Pagination.Summary>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full sm:w-36">
                <FilterSelect
                  compact
                  ariaLabel="每页条数"
                  options={pageSizeOptions}
                  value={String(query.pageSize)}
                  onChange={(value) =>
                    navigate({...query, page: 1, pageSize: Number(value)})
                  }
                />
              </div>
              <Pagination.Content className="justify-center sm:justify-end">
                <Pagination.Item>
                  <Pagination.Previous
                    isDisabled={result.page === 1 || isPending}
                    onPress={() => navigate({...query, page: result.page - 1})}
                  >
                    <Pagination.PreviousIcon />
                    <span className="hidden sm:inline">上一页</span>
                  </Pagination.Previous>
                </Pagination.Item>
                {marketPaginationItems(result.page, result.totalPages).map(
                  (item, index) =>
                    item === "ellipsis" ? (
                      <Pagination.Item key={`ellipsis-${index}`}>
                        <Pagination.Ellipsis />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={item}>
                        <Pagination.Link
                          isActive={item === result.page}
                          isDisabled={isPending}
                          onPress={() => navigate({...query, page: item})}
                        >
                          {item}
                        </Pagination.Link>
                      </Pagination.Item>
                    ),
                )}
                <Pagination.Item>
                  <Pagination.Next
                    isDisabled={result.page === result.totalPages || isPending}
                    onPress={() => navigate({...query, page: result.page + 1})}
                  >
                    <span className="hidden sm:inline">下一页</span>
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </div>
          </Pagination>
        </section>
      </div>
    </main>
  );
}

export function MarketAtmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      data-market-atmosphere
    >
      <Image
        alt=""
        className="absolute inset-x-0 top-0 h-[560px] w-full object-cover opacity-30"
        height={560}
        priority
        src="/market/compute-field.png"
        width={1440}
      />
      <Image
        alt=""
        className="absolute -right-40 -top-52 h-[876px] w-[1116px] max-w-none"
        height={876}
        src="/market/atmosphere-ice-blue.svg"
        unoptimized
        width={1116}
      />
      <Image
        alt=""
        className="absolute -left-[476px] top-14 h-[990px] w-[1232px] max-w-none opacity-70"
        height={990}
        src="/market/atmosphere-soft-cyan.svg"
        unoptimized
        width={1232}
      />
      <div className="absolute inset-x-0 top-44 h-[1140px] bg-linear-to-b from-white/0 via-[#f4fafc]/20 to-[#e8f5f8]/60" />
      <Image
        alt=""
        className="absolute left-[35%] top-[360px] h-[1020px] w-[1280px] max-w-none opacity-80"
        height={1020}
        src="/market/atmosphere-list-glow.svg"
        unoptimized
        width={1280}
      />
    </div>
  );
}

function FilterSelect({
  allLabel,
  ariaLabel,
  compact = false,
  label,
  options,
  value,
  onChange,
}: {
  allLabel?: string;
  ariaLabel: string;
  compact?: boolean;
  label?: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      {label ? (
        <p className="text-[13px] leading-5 font-medium text-[#24495d]">{label}</p>
      ) : null}
      <Select
        fullWidth
        aria-label={ariaLabel}
        value={value || "all"}
        variant="secondary"
        onChange={(nextValue) =>
          onChange(nextValue === "all" ? "" : String(nextValue))
        }
      >
        <Select.Trigger
          className={`${compact ? "h-8 rounded-xl px-3" : "h-11 rounded-[14px] px-4"} items-center border border-[#afc4ce]/45 bg-white/90 py-0 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)]`}
        >
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {allLabel ? (
              <ListBox.Item id="all" textValue={allLabel}>
                {allLabel}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ) : null}
            {options.map((option) => (
              <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

function FilterNumberField({
  ariaLabel,
  placeholder,
  value,
  onChange,
}: {
  ariaLabel: string;
  placeholder: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <NumberField
      fullWidth
      aria-label={ariaLabel}
      minValue={0}
      step={1}
      value={value ?? undefined}
      variant="secondary"
      onChange={(nextValue) =>
        onChange(Number.isFinite(nextValue) ? nextValue : null)
      }
    >
      <NumberField.Group className="h-11 rounded-[14px] border-[#afc4ce]/45 bg-white/90">
        <NumberField.DecrementButton />
        <NumberField.Input placeholder={placeholder} />
        <NumberField.IncrementButton />
      </NumberField.Group>
    </NumberField>
  );
}

function SortButton({
  children,
  isDisabled = false,
  isSelected,
  onPress,
}: {
  children: ReactNode;
  isDisabled?: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Button
      className={
        isSelected
          ? "h-9 rounded-xl border border-[#9fc4d2]/50 bg-[#e2f1f6] px-3 text-[#173e52] shadow-[0_4px_5px_rgba(71,123,145,0.1)]"
          : "h-9 rounded-xl border border-[#d0dfe5]/40 bg-white/80 px-3 text-[#466374]"
      }
      isDisabled={isDisabled}
      size="sm"
      variant="ghost"
      onPress={onPress}
    >
      {children}
    </Button>
  );
}

function getActiveFilters(query: MarketQuery) {
  const optionLabel = (options: readonly FilterOption[], value: string) =>
    options.find((option) => option.value === value)?.label;
  return [
    query.query ? `关键词：${query.query}` : null,
    query.productType !== defaultMarketQuery.productType
      ? optionLabel(productTypeOptions, query.productType)
      : null,
    query.gpuModel ? `GPU：${query.gpuModel}` : null,
    query.region ? `地域：${query.region}` : null,
    optionLabel(deliveryModeOptions, query.deliveryMode),
    optionLabel(pricingModeOptions, query.pricingMode),
    query.availableHours ? `时段：${query.availableHours}` : null,
    query.priceMin !== null ? `最低 ¥${query.priceMin}` : null,
    query.priceMax !== null ? `最高 ¥${query.priceMax}` : null,
    query.cardCountMin !== null ? `至少 ${query.cardCountMin} 卡` : null,
    query.sort !== defaultMarketQuery.sort ? optionLabel(sortOptions, query.sort) : null,
  ].filter((item): item is string => Boolean(item));
}
