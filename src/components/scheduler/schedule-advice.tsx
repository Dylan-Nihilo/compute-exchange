"use client";

import {Button} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";

import {useAuthStore} from "@/lib/auth/store";
import {formatDateTime} from "@/lib/format/date";
import {fetchScheduleAdvice, nodeStatuses} from "@/lib/scheduler";

export function ScheduleAdvice({orderNo, role}: {orderNo: string; role: "supplier" | "admin"}) {
  const accountId = useAuthStore((state) => state.accountId);
  const query = useQuery({queryKey: ["scheduler", accountId, role, "advice", orderNo], queryFn: () => fetchScheduleAdvice(role, orderNo), retry: false, staleTime: 0, gcTime: 0});
  const advice = query.data;
  return <section className="min-w-0 rounded-xl border border-border bg-surface p-4" aria-label="节点调度建议">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">节点调度建议</h2><Button size="sm" variant="outline" isPending={query.isFetching} onPress={() => void query.refetch()}>刷新建议</Button></div>
    <p className="mt-2 text-xs leading-5 text-muted">请根据节点当前容量确认交付；查看建议不会开通或分配资源。</p>
    {query.isPending ? <p className="mt-4 text-sm text-muted" role="status">正在查询建议…</p> : query.isError ? <p className="mt-4 text-sm text-danger" role="alert">调度建议读取失败：{query.error.message}</p> : advice ? <>
      <p className="mt-4 break-words text-sm font-medium">{advice.summary}</p>
      <p className="mt-2 text-xs text-muted">订单 {advice.order_no} · 需求 {advice.need_cards} 卡 · 更新于 {formatDateTime(advice.generated_at)}</p>
      {!advice.nodes.length ? <p className="mt-4 text-sm text-muted">暂无可用节点建议</p> : <ul className="mt-3 divide-y divide-border">{advice.nodes.map((node) => <li className="py-3" key={node.node_id}>
        <div className="flex flex-wrap justify-between gap-2 text-sm"><h3 className="break-all font-semibold">{node.node_name}</h3><span className={node.verdict === "recommended" ? "text-success" : "text-muted"}>{({recommended: "推荐节点", alternative: "备选节点", unavailable: "不可调度"})[node.verdict]} · {node.score} 分</span></div>
        <p className="mt-2 text-xs text-muted">{nodeStatuses[node.status]} · 可用 {node.available_cards} / 共 {node.total_cards} 卡</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5 text-muted">{node.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul>
      </li>)}</ul>}
    </> : null}
  </section>;
}
