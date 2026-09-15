"use client";

import {Button, Spinner} from "@heroui/react";
import {useMutation} from "@tanstack/react-query";
import Link from "next/link";
import {useEffect, useRef, useState} from "react";

import {MarketBrowser} from "@/components/market/market-browser";
import {ApiError} from "@/lib/api/client";
import {useAuthStore} from "@/lib/auth/store";
import {searchCompute, type AgentSearchResult} from "@/lib/agent-search";
import {mapComputeProduct} from "@/lib/market-api";
import {pricingModeCopy} from "@/lib/supplier-workspace";

const money = new Intl.NumberFormat("zh-CN", {style: "currency", currency: "CNY", maximumFractionDigits: 2});
const number = new Intl.NumberFormat("zh-CN", {maximumFractionDigits: 2});
const panelClass = "rounded-2xl border border-border bg-surface/90 p-5 sm:p-6";

export function AgentSearchView() {
  const accountId = useAuthStore((state) => state.accountId);
  return <SearchForm key={accountId} />;
}

function SearchForm() {
  const [query, setQuery] = useState("");
  const request = useRef<AbortController | null>(null);
  const search = useMutation({mutationFn: ({query, signal}: {query: string; signal: AbortSignal}) => searchCompute(query, fetch, signal), retry: false, gcTime: 0});
  useEffect(() => () => request.current?.abort(), []);
  const length = [...query.trim()].length;
  return <main className="mx-auto w-full max-w-[1408px] space-y-6 px-4 py-10 sm:px-8 lg:px-16">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">智能选型</h1><p className="mt-3 text-sm leading-6 text-muted">描述任务、预算和地域，查看算力推定与候选商品。</p></div><Link className="text-sm text-accent underline underline-offset-4" href="/market">返回市场筛选</Link></header>
    <form className={panelClass} onSubmit={(event) => {event.preventDefault(); if (!query.trim() || length > 500 || search.isPending) return; request.current = new AbortController(); search.mutate({query: query.trim(), signal: request.current.signal});}}>
      <label className="text-sm font-semibold" htmlFor="compute-requirement">算力需求</label>
      <textarea id="compute-requirement" className="mt-3 min-h-36 w-full resize-y rounded-xl border border-border bg-background p-4 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" placeholder="例如：部署72B大模型做INT8推理，预算每月10万元以内，优先北京机房。" value={query} maxLength={1000} disabled={search.isPending} onChange={(event) => {setQuery(event.target.value); search.reset();}} aria-describedby="requirement-length" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p id="requirement-length" className={`text-xs ${length > 500 ? "text-danger" : "text-muted"}`}>{length} / 500 字{length > 500 ? "，请精简描述" : ""}</p><Button type="submit" isDisabled={!query.trim() || length > 500 || search.isPending} isPending={search.isPending}>{search.isError ? "重新分析" : "开始选型"}</Button></div>
    </form>
    <div aria-live="polite" aria-busy={search.isPending}>
      {search.isPending ? <div className={`${panelClass} flex items-center gap-3`} role="status"><Spinner aria-hidden="true" size="sm" /><p className="text-sm">正在分析需求并匹配商品…</p></div> : search.isError ? <section className={panelClass} role="alert"><h2 className="font-semibold">本次选型未完成</h2><p className="mt-2 text-sm leading-6 text-muted">{search.error.message}</p>{search.error instanceof ApiError && search.error.status === 401 ? <Link className="mt-3 inline-block text-sm text-accent underline" href="/auth/login?next=%2Fmarket%2Fagent-search">重新登录</Link> : null}</section> : search.data ? <SearchResult result={search.data} /> : null}
    </div>
  </main>;
}

function SearchResult({result}: {result: AgentSearchResult}) {
  if (!result.relevant) return <section className={panelClass}><h2 className="font-semibold">请描述算力采购需求</h2><p className="mt-2 text-sm leading-6 text-muted">{result.reject_reason || "该问题与算力资源采购无关，请补充任务、预算或资源要求。"}</p></section>;
  const estimate = result.compute_estimate;
  const requirement = result.requirement;
  return <div className="space-y-6">
    <section className={panelClass}>
      <h2 className="text-xl font-semibold">算力推定</h2>
      {estimate.compute_class ? <p className="mt-2 text-sm text-muted">{estimate.compute_class}</p> : null}
      <dl className="mt-5 grid gap-5 sm:grid-cols-3">{[["所需总显存", estimate.total_vram_gb, " GB"], ["参考单卡显存", estimate.per_card_vram_gb, " GB"], ["推定最少卡数", estimate.min_cards, " 卡"]].map(([label, value, unit]) => <div key={String(label)}><dt className="text-xs text-muted">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{Number(value) > 0 ? `${number.format(Number(value))}${unit}` : "未明确"}</dd></div>)}</dl>
      {estimate.basis ? <p className="mt-5 text-sm leading-6">{estimate.basis}</p> : null}
      <p className="mt-3 text-xs leading-5 text-muted">推定供选型参考，实际可售规格和成交金额以商品详情及订单确认为准。</p>
    </section>
    {result.analysis_steps.length ? <section className={panelClass}><h2 className="text-base font-semibold">需求分析</h2><ol className="mt-4 grid gap-4 md:grid-cols-3">{result.analysis_steps.map((step, index) => <li className="min-w-0" key={index}><h3 className="text-sm font-semibold">{index + 1}. {step.title}</h3><p className="mt-2 break-words text-sm leading-6 text-muted">{step.detail}</p></li>)}</ol></section> : null}
    <section className={panelClass}><h2 className="text-base font-semibold">匹配条件</h2><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{[
      ["用途", requirement.purpose || "未明确"], ["参考型号", requirement.gpu_models.join("、") || "未限定"], ["匹配卡数", requirement.card_count > 0 ? `${requirement.card_count} 卡` : "未明确"], ["地域", requirement.region || "未限定"], ["计费方式", pricingModeCopy[requirement.pricing_mode] || "未限定"], ["预算上限", requirement.budget_fen_max > 0 ? money.format(requirement.budget_fen_max / 100) : "未限定"], ["需求周期", requirement.pricing_mode === "perpetual" ? "一次性采购" : requirement.duration_hint > 0 ? `${requirement.duration_hint} 个计费周期` : "未明确"],
    ].map(([label, value]) => <div className="min-w-0" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-2 break-words">{value}</dd></div>)}</dl></section>
    <section aria-label="候选商品"><h2 className="mb-4 text-xl font-semibold">候选商品 · {result.matches.length}</h2>
      {!result.matches.length ? <div className={panelClass}><h3 className="font-semibold">暂无匹配商品</h3><p className="mt-2 text-sm leading-6 text-muted">{result.note || "当前暂无符合条件的商品，可调整描述后重新分析。"}</p><Link className="mt-3 inline-block text-sm text-accent underline" href="/market">查看全部商品</Link></div> : <div className="space-y-6">{result.matches.map((match) => <section className="space-y-3" key={match.product.id} aria-label={`候选商品 ${match.product.id}`}><div className="px-1"><h3 className="text-sm font-semibold">匹配分 {match.score} / 100</h3><ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-muted">{match.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div><MarketBrowser supplies={[mapComputeProduct(match.product)]} /></section>)}</div>}
    </section>
  </div>;
}
