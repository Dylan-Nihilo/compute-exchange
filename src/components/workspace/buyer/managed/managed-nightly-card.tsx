"use client";

import {useQuery} from "@tanstack/react-query";
import {useEffect, useState} from "react";

import {SectionQueryState} from "@/components/managed/query-states";
import {formatNightWindow} from "@/lib/flexible-pricing";
import {formatDateTime} from "@/lib/format/date";
import {fetchOrderNights, nightStateLabel, type OrderNights} from "@/lib/managed-orders";
import {nightlyProgress, type NightlyPhase} from "@/lib/nightly";

import {ManagedSection} from "./managed-section";

export function orderNightsKey(orderNo: string) {
  return ["buyer", "orders", "nights", orderNo] as const;
}

const chipTone: Record<OrderNights["nights"][number]["state"], string> = {
  active: "border-[#173447] bg-[#173447] text-white",
  booked: "border-border",
  ended: "border-border text-muted",
  failed: "border-danger text-danger",
};

/**
 * Per-night record of a nightly managed order (GET /orders/:id/nights). Errors are shown as-is; no schedule is
 * guessed from the order snapshot.
 */
export function ManagedNightlyCard({orderNo}: {orderNo: string}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: orderNightsKey(orderNo),
    queryFn: () => fetchOrderNights(orderNo),
    refetchInterval: 60_000,
    retry: false,
  });

  return (
    <ManagedSection title="包夜排期" description="每晚窗口内自动开机，窗口外自动停机；所有夜晚使用同一节点的同一组卡。">
      <SectionQueryState
        error={query.error}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取每晚记录"
        notOpenText="包夜每晚记录接口暂未开放。如遇无法登录，请通过工单联系平台。"
        onRetry={() => void query.refetch()}
      >
        {query.data ? <NightlyBody data={query.data} now={now} /> : null}
      </SectionQueryState>
    </ManagedSection>
  );
}

function NightlyBody({data, now}: {data: OrderNights; now: number}) {
  const progress = nightlyProgress(data, now);
  const inside = progress.phase === "in_window" || progress.phase === "opening";
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Fact label="每晚窗口" value={formatNightWindow(data.night_start_min, data.night_end_min)} />
        <Fact
          label="夜晚进度"
          value={`已过 ${progress.completed} / 共 ${progress.total} 晚（购买 ${data.purchased_nights} 晚${data.extended_nights ? ` + 补偿 ${data.extended_nights} 晚` : ""}）`}
        />
        <Fact label="当前状态" value={phaseCopy[progress.phase]} />
        <Fact
          label={inside ? "本晚窗口结束" : "下一窗口开始"}
          value={inside
            ? formatDateTime(progress.currentWindowEnd!)
            : progress.nextWindowStart ? formatDateTime(progress.nextWindowStart) : "—"}
        />
        {data.extended_nights ? <Fact label="停机补偿" value={`已补加 ${data.extended_nights} 晚（同一组卡、同一窗口）`} /> : null}
      </dl>
      <ul aria-label="每晚记录" className="flex flex-wrap gap-1.5">
        {data.nights.map((night) => (
          <li
            className={`rounded-lg border px-2 py-1 text-xs ${chipTone[night.state]}`}
            key={night.night_date}
            title={`${formatDateTime(night.window_start)} — ${formatDateTime(night.window_end)}${night.unparked_at ? ` · 开机于 ${formatDateTime(night.unparked_at)}` : ""}`}
          >
            {night.night_date.slice(5)} {nightStateLabel(night)}
          </li>
        ))}
      </ul>
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
        <li>仅在每晚窗口内可经网关登录；窗口结束前 30 分钟、10 分钟提醒，到点断开会话，容器停机但数据保留。</li>
        <li>窗口内因平台或供给方原因未能开机的时段计入停机；默认补偿为补加一晚（同一组卡已被预订时改为按比例退费）。</li>
      </ul>
    </div>
  );
}

const phaseCopy: Record<NightlyPhase, string> = {
  before_first: "首晚窗口未开始，开始前约 10 分钟自动开通",
  in_window: "窗口开放中，可登录",
  opening: "本晚窗口已开始，正在开机",
  between: "白天停机，夜间窗口自动开机",
  ended: "全部夜晚已结束",
};

function Fact({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium break-all">{value}</dd>
    </div>
  );
}
