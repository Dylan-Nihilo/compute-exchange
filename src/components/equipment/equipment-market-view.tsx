"use client";

import {Button, Card, Chip, ListBox, Modal, Pagination, Select, Skeleton, Spinner} from "@heroui/react";
import {EmptyState} from "@heroui-pro/react/empty-state";
import {useMutation, useQuery} from "@tanstack/react-query";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useState, useTransition, type FormEvent} from "react";

import {marketPaginationItems} from "@/components/market/market-data";
import {
  buildEquipmentMarketHref,
  equipmentTypeLabels,
  equipmentTypes,
  fetchEquipmentMarket,
  formatWanRange,
  parseWanRange,
  submitEquipmentInquiry,
  type EquipmentInquiryInput,
  type EquipmentItem,
  type EquipmentQuery,
} from "@/lib/equipment-api";
import {useCurrentAccount} from "@/lib/auth/queries";
import {useAuthStore} from "@/lib/auth/store";

// 与工单/发票弹框同源的市场区输入样式
const fieldClass =
  "h-10 w-full rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba] outline-none focus:border-[#24495d]";
const areaClass =
  "w-full rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 py-2.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba] outline-none focus:border-[#24495d]";

type FilterOption = {label: string; value: string};

const conditionOptions: readonly FilterOption[] = [
  {label: "全部设备", value: ""},
  {label: "一手设备", value: "new"},
  {label: "二手设备", value: "used"},
];
const conditionDescriptions: Record<string, string> = {
  "": "一手与二手设备同场挂牌，成色在卡片上明确标注。",
  new: "一手设备：全新未拆封或原厂授权渠道，附原厂质保。",
  used: "二手设备：必须标注出厂年份与使用情况，建议线下验货后签约。",
};
const regionOptions: readonly FilterOption[] = [
  {label: "北京", value: "北京"},
  {label: "上海", value: "上海"},
  {label: "深圳", value: "深圳"},
  {label: "杭州", value: "杭州"},
  {label: "成都", value: "成都"},
  {label: "乌兰察布", value: "乌兰察布"},
];
const deliveryWindowOptions = ["1 周内", "2-4 周", "1-3 个月", "3 个月以上"] as const;

type EquipmentMarketViewProps = {
  query: EquipmentQuery;
};

export function EquipmentMarketView({query}: EquipmentMarketViewProps) {
  const router = useRouter();
  const [isNavPending, startTransition] = useTransition();
  const [draftRegion, setDraftRegion] = useState(query.region);
  const [priceRange, setPriceRange] = useState(formatWanRange(query.priceMinWan, query.priceMaxWan));
  const [inquiryItem, setInquiryItem] = useState<EquipmentItem | null>(null);
  const parsedRange = parseWanRange(priceRange);
  const accountQuery = useCurrentAccount();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  // 供给方直达发布页; 买家引导入驻; 运营方不展示发布入口。
  const roles = accountQuery.data?.roles ?? [];
  const canPublish = roles.includes("supplier");
  const canApply = roles.includes("buyer") && !canPublish;

  // 浏览需登录: 数据经鉴权 BFF 在客户端拉取(令牌过期由 BFF 自动 refresh)
  const market = useQuery({
    queryKey: ["equipment-market", buildEquipmentMarketHref(query)],
    queryFn: () => fetchEquipmentMarket(query),
  });
  const result = market.data;
  const isPending = isNavPending || market.isFetching;
  const startItem = result?.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const endItem = result ? Math.min(result.page * result.pageSize, result.total) : 0;

  const navigate = (nextQuery: EquipmentQuery) => {
    startTransition(() => router.push(buildEquipmentMarketHref(nextQuery)));
  };
  // 超页回夹到最后一页(原 SSR redirect 的客户端等价物)
  useEffect(() => {
    if (result && query.page > result.totalPages) {
      router.replace(buildEquipmentMarketHref({...query, page: result.totalPages}));
    }
  }, [result, query, router]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parsedRange) return;
    navigate({...query, region: draftRegion, ...parsedRange, page: 1});
  };
  const changeSort = (sort: EquipmentQuery["sort"]) => navigate({...query, sort, page: 1});

  return (
    <main className="omnis-workbench-controls relative min-h-svh overflow-hidden pb-10 pt-12 text-[#102b3b] sm:pt-16">
      <div
        aria-busy={isPending}
        className={`relative mx-auto w-full max-w-[1408px] px-4 transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none sm:px-8 lg:px-16 ${
          isPending ? "translate-y-px opacity-80" : ""
        }`}
      >
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[36px] leading-tight font-semibold tracking-[-0.03em] text-[#071627] sm:text-[44px] sm:leading-[56px]">
              设备市场
            </h1>
            <p className="mt-1 text-sm leading-[22px] text-[#4b6276] sm:text-base">
              一手 / 二手设备挂牌 · 询价撮合 · 采购顾问跟进
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href="/broker/equipment"
            >
              了解设备整包销售
            </Link>
            {!hasHydrated || accountQuery.isPending ? null : canPublish ? (
              <Link
                className="rounded-xl border border-[#ddf3a8]/70 bg-[#c4ec68] px-5 py-3 text-sm font-semibold text-[#112b31] shadow-[0_6px_14px_rgba(125,171,54,0.16)] hover:bg-[#b9e35c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href="/console/supplier/equipments/new"
              >
                + 发布设备商品
              </Link>
            ) : canApply ? (
              <Link
                className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href="/supplier/apply"
              >
                成为供给方，发布设备
              </Link>
            ) : null}
          </div>
        </header>

        <section aria-label="设备成色" className="rounded-[20px] border border-[#171e1c]/3 bg-white/70 p-3 backdrop-blur-xl">
          <div className="omnis-scrollbar-x flex items-center gap-2.5">
            {conditionOptions.map((option) => {
              const selected = query.conditionType === option.value;
              return (
                <Button
                  className={
                    selected
                      ? "h-12 min-w-40 shrink-0 rounded-[14px] border border-[#9fc4d2]/50 bg-[#e2f1f6] text-[#15384d] shadow-[0_4px_5px_rgba(71,123,145,0.1)]"
                      : "h-12 min-w-40 shrink-0 rounded-[14px] bg-white/70 text-[#496777]"
                  }
                  key={option.value || "all"}
                  variant="ghost"
                  onPress={() => navigate({...query, conditionType: option.value, page: 1})}
                >
                  {option.label}
                </Button>
              );
            })}
            <p className="hidden min-w-80 flex-1 px-1 text-sm leading-[22px] text-[#496777] lg:block">
              {conditionDescriptions[query.conditionType]}
            </p>
          </div>
        </section>

        <form
          aria-label="设备筛选"
          className="mt-5 rounded-[20px] border border-[#171e1c]/2 bg-white/75 px-4 py-3 backdrop-blur-xl sm:px-6"
          onSubmit={submit}
        >
          <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="设备类型">
            <span className="mr-1 text-[13px] text-[#5f7888]">类型</span>
            <TypeChip isSelected={query.equipmentType === ""} onPress={() => navigate({...query, equipmentType: "", page: 1})}>
              全部类型
            </TypeChip>
            {equipmentTypes.map((type) => (
              <TypeChip
                isSelected={query.equipmentType === type}
                key={type}
                onPress={() => navigate({...query, equipmentType: type, page: 1})}
              >
                {equipmentTypeLabels[type]}
              </TypeChip>
            ))}
          </div>

          <div className="mt-4 grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[220px_minmax(240px,1fr)_120px_minmax(0,1fr)]">
            <FilterSelect
              allLabel="全部"
              ariaLabel="按地域筛选"
              label="地域"
              options={regionOptions}
              value={draftRegion}
              onChange={setDraftRegion}
            />
            <div className="grid min-w-0 gap-2">
              <label className="text-[13px] leading-5 font-medium text-[#24495d]" htmlFor="equipment-price-range">
                价格区间（万元）
              </label>
              <input
                className={fieldClass.replace("h-10", "h-11").replace("rounded-xl", "rounded-[14px]")}
                id="equipment-price-range"
                placeholder="如 50-300，留空则不限"
                value={priceRange}
                onChange={(event) => setPriceRange(event.target.value)}
              />
            </div>
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
            <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
              <span className="text-[13px] text-[#5f7888]">排序</span>
              <SortButton
                isSelected={query.sort === "price_asc" || query.sort === "price_desc"}
                onPress={() => changeSort(query.sort === "price_asc" ? "price_desc" : "price_asc")}
              >
                价格{query.sort === "price_asc" ? " ↑" : query.sort === "price_desc" ? " ↓" : ""}
              </SortButton>
              <SortButton isSelected={query.sort === "created_at_desc"} onPress={() => changeSort("created_at_desc")}>
                最新发布
              </SortButton>
              <span aria-live="polite" className="text-[13px] font-medium text-[#496877]">
                共 {result ? result.total : "—"} 件设备
              </span>
            </div>
          </div>
          {parsedRange === null ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              请输入有效价格区间（万元），例如 50-300。
            </p>
          ) : null}
        </form>

        <p className="mt-4 rounded-[14px] border border-[#bfdbfe]/70 bg-[#eff6ff]/80 px-4 py-3 text-[13px] leading-5 text-[#1e40af]" role="note">
          设备商品为<strong>询价撮合</strong>，不支持在线支付下单——设备金额大、需线下验货与议价，提交询价后由平台采购顾问跟进促成交易。
        </p>

        <section aria-label="设备商品列表" className="mt-6">
          {market.isPending ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {["s1", "s2", "s3", "s4", "s5", "s6"].map((key) => (
                <Skeleton className="h-64 w-full rounded-[22px]" key={key} />
              ))}
            </div>
          ) : market.isError ? (
            <div className="rounded-[22px] border border-white/70 bg-white/80 p-10 text-center shadow-[0_16px_36px_rgba(6,37,59,0.06)] backdrop-blur-xl">
              <p className="text-sm font-medium text-[#173447]" role="alert">设备列表暂时不可用</p>
              <p className="mt-2 text-sm text-[#5f7888]">{market.error instanceof Error ? market.error.message : "请稍后重试"}</p>
              <Button className="mt-4 h-10 rounded-xl" variant="tertiary" onPress={() => void market.refetch()}>
                重试
              </Button>
            </div>
          ) : result?.items.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {result.items.map((item) => (
                <EquipmentOfferCard item={item} key={item.id} onInquiry={() => setInquiryItem(item)} />
              ))}
            </div>
          ) : (
            <div className="rounded-[22px] border border-white/70 bg-white/80 shadow-[0_16px_36px_rgba(6,37,59,0.06)] backdrop-blur-xl">
              <EmptyState className="py-16" size="lg">
                <EmptyState.Header>
                  <EmptyState.Title>暂无匹配设备</EmptyState.Title>
                  <EmptyState.Description>请调整设备类型、成色、地域或价格区间。</EmptyState.Description>
                </EmptyState.Header>
              </EmptyState>
            </div>
          )}

          {result ? <Pagination
            aria-label="设备商品分页"
            className="mt-6 w-full flex-wrap justify-between gap-3 rounded-[18px] border border-white/70 bg-white/75 px-4 py-2.5 backdrop-blur-xl"
          >
            <Pagination.Summary>
              显示 {startItem}–{endItem}，共 {result.total} 条
            </Pagination.Summary>
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
              {marketPaginationItems(result.page, result.totalPages).map((item, index) =>
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
          </Pagination> : null}
        </section>
      </div>

      <EquipmentInquiryModal item={inquiryItem} onClose={() => setInquiryItem(null)} />
    </main>
  );
}

function EquipmentOfferCard({item, onInquiry}: {item: EquipmentItem; onInquiry: () => void}) {
  const subtitle = [item.brand, item.model].filter(Boolean).join(" · ");
  return (
    <Card
      aria-label={`${item.title} 设备商品`}
      className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/82 p-5 shadow-[0_16px_36px_rgba(6,37,59,0.08)] backdrop-blur-xl"
      role="article"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip className="bg-[#e7f2f5] text-[#24546b]" size="sm" variant="soft">
              {item.typeLabel}
            </Chip>
            <Chip
              className={item.condition === "used" ? "bg-[#fff1e4] text-[#b4531a]" : "bg-[#e6f6ec] text-[#1e6b43]"}
              size="sm"
              variant="soft"
            >
              {item.conditionLabel}
            </Chip>
          </div>
          <h2 className="mt-2 truncate text-lg leading-7 font-semibold text-[#102b3b]">{item.title}</h2>
          {subtitle ? <p className="mt-0.5 truncate text-[13px] leading-5 text-[#496777]">{subtitle}</p> : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] leading-5 text-[#456579]">
        <CardSpec label="数量" value={`${item.quantity} ${item.unitLabel}`} />
        <CardSpec label="地域" value={item.region || "—"} />
        {item.condition === "used" ? (
          <CardSpec label="出厂年份" value={item.manufactureYear ? String(item.manufactureYear) : "—"} />
        ) : null}
        {item.condition === "new" ? <CardSpec label="成色" value="全新" /> : null}
        {/* 信息隔离: 供应方名称由后端脱敏(北京***有限公司), 无认证企业时兜底文案 */}
        <CardSpec label="供应方" value={item.supplierName || "经平台审核"} />
      </dl>

      {item.condition === "used" && item.usageDesc ? (
        <p className="mt-3 rounded-lg bg-[#fff7ed] px-3 py-2 text-xs leading-[18px] text-[#c2410c]">
          使用情况：{item.usageDesc}
        </p>
      ) : item.description ? (
        <p className="mt-3 line-clamp-2 text-xs leading-[18px] text-[#5f7888]">{item.description}</p>
      ) : null}

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#eef4f6] pt-3.5">
        <div className="min-w-0">
          <p className="truncate text-[22px] leading-7 font-semibold tabular-nums text-[#102b3b]">
            {item.priceLabel}
            {item.priceNegotiable ? null : (
              <span className="ml-1 text-xs font-normal text-[#5f7888]">/{item.unitLabel}</span>
            )}
          </p>
          <p className="text-xs leading-[18px] text-[#657f8f]">
            {item.priceNegotiable ? "按项目规模报价" : "批量采购可议价"}
          </p>
        </div>
        <Button
          className="h-10 shrink-0 rounded-xl border border-[#ddf3a8]/70 bg-[#c4ec68] px-5 text-[#112b31] shadow-[0_6px_14px_rgba(125,171,54,0.16)] hover:bg-[#b9e35c]"
          onPress={onInquiry}
        >
          询价
        </Button>
      </div>
    </Card>
  );
}

function CardSpec({label, value}: {label: string; value: string}) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="shrink-0 text-[#688495]">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}

function EquipmentInquiryModal({item, onClose}: {item: EquipmentItem | null; onClose: () => void}) {
  const [deliveryWindow, setDeliveryWindow] = useState("");
  const mutation = useMutation({
    mutationFn: ({id, input}: {id: string; input: EquipmentInquiryInput}) => submitEquipmentInquiry(id, input),
  });
  const close = () => {
    if (mutation.isPending) return;
    mutation.reset();
    setDeliveryWindow("");
    onClose();
  };

  return (
    <Modal.Root isOpen={item !== null} onOpenChange={(isOpen) => { if (!isOpen) close(); }}>
      <Modal.Backdrop isDismissable={!mutation.isPending}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-xl">
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold text-[#173447]">设备询价</Modal.Heading>
            </Modal.Header>
            {item === null ? null : mutation.isSuccess ? (
              <Modal.Body className="gap-3">
                <p className="text-sm font-medium text-[#173447]" role="status">
                  询价已提交（编号 #{mutation.data.id}）
                </p>
                <p className="text-sm leading-6 text-[#4b6276]">
                  {mutation.data.note ??
                    "平台采购顾问将通过你填写的联系方式跟进。设备类交易不支持线上支付，请通过线下验货与合同完成交易。"}
                </p>
                <Button className="mt-2 h-10 rounded-xl" onPress={close}>
                  完成
                </Button>
              </Modal.Body>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (mutation.isPending) return;
                  const data = new FormData(event.currentTarget);
                  const field = (name: string) => String(data.get(name) ?? "").trim();
                  const note = field("message");
                  const message = [deliveryWindow ? `【期望交付】${deliveryWindow}` : "", note]
                    .filter(Boolean)
                    .join("\n")
                    .slice(0, 2000);
                  mutation.mutate({
                    id: item.id,
                    input: {
                      quantity: Number(field("quantity")),
                      contact_name: field("contact_name"),
                      contact_phone: field("contact_phone"),
                      message,
                    },
                  });
                }}
              >
                <Modal.Body className="gap-4">
                  <p className="rounded-xl bg-[#f2f8fa] px-4 py-3 text-sm leading-6 text-[#345a6d]">
                    {item.title} · {item.conditionLabel} ·{" "}
                    {item.priceNegotiable ? "价格面议" : `参考价 ${item.priceLabel}/${item.unitLabel}`} · 可售{" "}
                    {item.quantity} {item.unitLabel}
                  </p>
                  <p className="text-xs leading-5 text-[#5f7888]">
                    设备为询价撮合，不支持在线支付——提交后由平台采购顾问联系你完成比价、验货与签约。
                  </p>

                  <fieldset className="grid gap-4 sm:grid-cols-2" disabled={mutation.isPending}>
                    <label className="block text-[13px] font-medium text-[#24495d]">
                      采购数量（{item.unitLabel}）
                      <input
                        className={`mt-1.5 ${fieldClass}`}
                        max={item.quantity}
                        min={1}
                        name="quantity"
                        required
                        type="number"
                      />
                    </label>
                    <label className="block text-[13px] font-medium text-[#24495d]">
                      期望交付时间（选填）
                      <select
                        className={`mt-1.5 ${fieldClass}`}
                        name="delivery_window"
                        value={deliveryWindow}
                        onChange={(event) => setDeliveryWindow(event.target.value)}
                      >
                        <option value="">请选择</option>
                        {deliveryWindowOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[13px] font-medium text-[#24495d]">
                      联系人
                      <input autoComplete="name" className={`mt-1.5 ${fieldClass}`} maxLength={64} name="contact_name" required />
                    </label>
                    <label className="block text-[13px] font-medium text-[#24495d]">
                      联系电话
                      <input autoComplete="tel" className={`mt-1.5 ${fieldClass}`} maxLength={20} name="contact_phone" required type="tel" />
                    </label>
                    <label className="block text-[13px] font-medium text-[#24495d] sm:col-span-2">
                      补充要求 / 留言（选填）
                      <textarea
                        className={`mt-1.5 min-h-24 ${areaClass}`}
                        maxLength={1900}
                        name="message"
                        placeholder="如：需要原厂安装服务、含 IB 网络、需要融资租赁方案、需先线下验货…"
                      />
                    </label>
                  </fieldset>

                  {mutation.isError ? (
                    <p className="text-sm text-danger" role="alert">
                      {mutation.error.message}
                    </p>
                  ) : null}
                </Modal.Body>
                <Modal.Footer className="gap-3">
                  <Button className="h-10 rounded-xl" isDisabled={mutation.isPending} variant="ghost" onPress={close}>
                    取消
                  </Button>
                  <Button
                    className="h-10 rounded-xl border border-[#ddf3a8]/70 bg-[#c4ec68] text-[#112b31] hover:bg-[#b9e35c]"
                    isDisabled={mutation.isPending}
                    isPending={mutation.isPending}
                    type="submit"
                  >
                    {mutation.isPending ? "正在提交…" : "提交询价"}
                  </Button>
                </Modal.Footer>
              </form>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function TypeChip({children, isSelected, onPress}: {children: string; isSelected: boolean; onPress: () => void}) {
  return (
    <Button
      className={
        isSelected
          ? "h-9 rounded-xl border border-[#9fc4d2]/50 bg-[#e2f1f6] px-3 text-[#173e52] shadow-[0_4px_5px_rgba(71,123,145,0.1)]"
          : "h-9 rounded-xl border border-[#d0dfe5]/40 bg-white/80 px-3 text-[#466374]"
      }
      size="sm"
      variant="ghost"
      onPress={onPress}
    >
      {children}
    </Button>
  );
}

function SortButton({children, isSelected, onPress}: {children: React.ReactNode; isSelected: boolean; onPress: () => void}) {
  return (
    <Button
      className={
        isSelected
          ? "h-9 rounded-xl border border-[#9fc4d2]/50 bg-[#e2f1f6] px-3 text-[#173e52] shadow-[0_4px_5px_rgba(71,123,145,0.1)]"
          : "h-9 rounded-xl border border-[#d0dfe5]/40 bg-white/80 px-3 text-[#466374]"
      }
      size="sm"
      variant="ghost"
      onPress={onPress}
    >
      {children}
    </Button>
  );
}

function FilterSelect({
  allLabel,
  ariaLabel,
  label,
  options,
  value,
  onChange,
}: {
  allLabel?: string;
  ariaLabel: string;
  label?: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-2">
      {label ? <p className="text-[13px] leading-5 font-medium text-[#24495d]">{label}</p> : null}
      <Select
        fullWidth
        aria-label={ariaLabel}
        value={value ? `value:${value}` : "all"}
        variant="secondary"
        onChange={(nextValue) =>
          onChange(nextValue === "all" || nextValue === null ? "" : String(nextValue).slice("value:".length))
        }
      >
        <Select.Trigger className="h-11 items-center rounded-[14px] border border-[#afc4ce]/45 bg-white/90 px-4 py-0 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)]">
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
              <ListBox.Item id={`value:${option.value}`} key={option.value} textValue={option.label}>
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

