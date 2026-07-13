import type {Metadata} from "next";

export const metadata: Metadata = {
  title: "算力市场",
  description: "按 GPU 型号、区域与交付方式查找可用算力。",
};

const supplies = [
  {
    id: "supply-h100-64",
    name: "H100 SXM 80GB 训练集群",
    location: "内蒙古 · 乌兰察布",
    capacity: "64 GPU",
    delivery: "容器集群",
    network: "100 Gbps",
    price: "¥18.60",
  },
  {
    id: "supply-h20-128",
    name: "H20 96GB 推理集群",
    location: "宁夏 · 中卫",
    capacity: "128 GPU",
    delivery: "专属实例",
    network: "50 Gbps",
    price: "¥9.80",
  },
  {
    id: "supply-a800-32",
    name: "A800 80GB 训练资源",
    location: "上海 · 临港",
    capacity: "32 GPU",
    delivery: "裸金属",
    network: "25 Gbps",
    price: "¥12.40",
  },
] as const;

type MarketPageProps = {
  searchParams: Promise<{q?: string | string[]}>;
};

export default async function MarketPage({searchParams}: MarketPageProps) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = rawQuery?.trim() ?? "";
  const normalizedQuery = query.toLocaleLowerCase("zh-CN");
  const results = normalizedQuery
    ? supplies.filter((supply) =>
        [
          supply.name,
          supply.location,
          supply.capacity,
          supply.delivery,
          supply.network,
        ].some((value) => value.toLocaleLowerCase("zh-CN").includes(normalizedQuery)),
      )
    : supplies;

  return (
    <main>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Compute Market
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
            查找可用算力
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            按 GPU 型号、部署区域或交付方式检索当前供给。
          </p>

          <form action="/market" className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row" role="search">
            <label className="sr-only" htmlFor="market-search">
              搜索算力供给
            </label>
            <input
              className="min-h-12 min-w-0 flex-1 rounded-lg border border-border-secondary bg-background px-4 text-base text-foreground outline-none placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/20"
              defaultValue={query}
              id="market-search"
              name="q"
              placeholder="搜索 GPU 型号、区域或交付方式"
              type="search"
            />
            <button
              className="min-h-12 rounded-lg bg-accent px-6 text-sm font-medium text-accent-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              type="submit"
            >
              搜索
            </button>
          </form>
        </div>
      </section>

      <section aria-labelledby="supply-heading" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight" id="supply-heading">
              可用供给
            </h2>
            <p aria-live="polite" className="mt-1 text-sm text-muted">
              {query ? `“${query}”找到 ${results.length} 条结果` : `共 ${results.length} 条结果`}
            </p>
          </div>
          {query ? (
            <a
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground underline decoration-border-tertiary underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-focus"
              href="/market"
            >
              清除搜索
            </a>
          ) : null}
        </div>

        {results.length > 0 ? (
          <div className="divide-y divide-border border-b border-border">
            {results.map((supply) => (
              <article className="py-7 sm:py-8" key={supply.id}>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(7rem,0.6fr))_minmax(7rem,0.7fr)] lg:items-center">
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-foreground">
                      {supply.name}
                    </p>
                    <p className="mt-2 text-sm text-muted">{supply.location}</p>
                  </div>
                  <SupplyDetail label="可用规模" value={supply.capacity} />
                  <SupplyDetail label="交付方式" value={supply.delivery} />
                  <SupplyDetail label="网络带宽" value={supply.network} />
                  <div className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
                    <p className="text-xs font-medium text-muted">参考单价</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {supply.price}
                    </p>
                    <p className="text-xs text-muted">每 GPU·小时</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border-b border-border py-16 text-center">
            <p className="font-medium text-foreground">暂无匹配供给</p>
            <p className="mt-2 text-sm text-muted">请尝试 GPU 型号、城市或交付方式。</p>
          </div>
        )}
      </section>
    </main>
  );
}

function SupplyDetail({label, value}: {label: string; value: string}) {
  return (
    <dl>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </dl>
  );
}
