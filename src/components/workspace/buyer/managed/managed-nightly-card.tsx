"use client";

import {useEffect, useState} from "react";

import {formatNightWindow} from "@/lib/flexible-pricing";
import {formatDateTime} from "@/lib/format/date";
import {nightlySchedule, type NightlyOrderSnapshot, type NightlySchedule} from "@/lib/nightly";

import {ManagedSection} from "./managed-section";

const statusCopy = {done: "已结束", current: "进行中", upcoming: "待开始"} as const;

/**
 * Nightly schedule of a managed order. The backend exposes no per-night API (lease_nights), so the schedule is
 * derived from the order snapshot (night_start_date + window + duration) and lease_end_at (extra nights).
 * A missing snapshot is an explicit error, never a guessed schedule.
 */
export function ManagedNightlyCard({snapshot}: {snapshot: NightlyOrderSnapshot | null}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <ManagedSection title="包夜排期" description="每晚窗口内自动开机，窗口外自动停机；所有夜晚使用同一节点的同一组卡。">
      {snapshot ? <NightlyBody schedule={nightlySchedule(snapshot, now)} snapshot={snapshot} /> : (
        <p className="text-sm text-danger" role="alert">
          包夜排期读取失败：订单未返回起始夜晚与窗口快照，暂无法显示每晚安排。请刷新重试，或通过工单联系平台。
        </p>
      )}
    </ManagedSection>
  );
}

function NightlyBody({snapshot, schedule}: {snapshot: NightlyOrderSnapshot; schedule: NightlySchedule}) {
  const total = schedule.nights.length;
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Fact label="每晚窗口" value={formatNightWindow(snapshot.window.startMin, snapshot.window.endMin)} />
        <Fact
          label="夜晚进度"
          value={`已过 ${schedule.completed} / 共 ${total} 晚${schedule.extraNights ? `（含补偿 ${schedule.extraNights} 晚）` : ""}`}
        />
        <Fact label="当前状态" value={phaseCopy(schedule)} />
        <Fact
          label={schedule.phase === "in_window" ? "本晚窗口结束" : "下一窗口开始"}
          value={schedule.phase === "in_window"
            ? formatDateTime(schedule.currentWindowEnd!.toISOString())
            : schedule.nextWindowStart ? formatDateTime(schedule.nextWindowStart.toISOString()) : "—"}
        />
        {schedule.extraNights ? <Fact label="停机补偿" value={`已补加 ${schedule.extraNights} 晚（同一组卡、同一窗口）`} /> : null}
      </dl>
      <ul aria-label="每晚安排" className="flex flex-wrap gap-1.5">
        {schedule.nights.map((night) => (
          <li
            className={`rounded-lg border px-2 py-1 text-xs ${
              night.status === "current" ? "border-[#173447] bg-[#173447] text-white" : night.status === "done" ? "border-border text-muted" : "border-border"
            }`}
            key={night.date}
            title={`${formatDateTime(night.startAt.toISOString())} — ${formatDateTime(night.endAt.toISOString())}`}
          >
            {night.date.slice(5)} {statusCopy[night.status]}{night.extra ? " · 补偿" : ""}
          </li>
        ))}
      </ul>
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
        <li>仅在每晚窗口内可经网关登录；窗口结束前 30 分钟、10 分钟提醒，到点断开会话，容器停机但数据保留。</li>
        <li>窗口内因平台或供给方原因未能开机的时段计入停机；默认补偿为补加一晚（同一组卡已被预订时改为按比例退费）。</li>
        <li>进度按订单时间推算，每晚实际开机情况以「连接信息」中的租约状态与停机记录为准。</li>
      </ul>
    </div>
  );
}

function phaseCopy(schedule: NightlySchedule) {
  if (schedule.phase === "in_window") return "窗口开放中，可登录";
  if (schedule.phase === "ended") return "全部夜晚已结束";
  if (schedule.phase === "before_first") return "首晚窗口未开始，开始前约 10 分钟自动开通";
  return "白天停机，夜间窗口自动开机";
}

function Fact({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium break-all">{value}</dd>
    </div>
  );
}
