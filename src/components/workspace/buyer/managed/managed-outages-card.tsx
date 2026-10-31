"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {SectionQueryState} from "@/components/managed/query-states";
import {isBackendRequestError} from "@/lib/api/envelope";
import type {OutageRemedy} from "@/lib/domain/contracts";
import {formatDateTime} from "@/lib/format/date";
import {
  fetchOrderOutages,
  formatFen,
  formatMinutes,
  outageCauseCopy,
  outageItemStatus,
  outageLiableCopy,
  refundThresholdText,
  remedyLabel,
  setOutageRemedy,
  type OrderOutages,
} from "@/lib/managed-orders";

import {ManagedSection} from "./managed-section";

export function managedOutagesKey(orderNo: string) {
  return ["buyer", "orders", "managed-outages", orderNo] as const;
}

/**
 * Outage records and compensation choice for a managed order (GET /orders/:id/outages,
 * PUT /orders/:id/outage-remedy, docs/25 §25.7.6). Button availability follows the backend flags.
 */
export function ManagedOutagesCard({orderNo, nightly}: {orderNo: string; nightly?: {extraNights: number | null}}) {
  const query = useQuery({
    queryKey: managedOutagesKey(orderNo),
    queryFn: () => fetchOrderOutages(orderNo),
    refetchInterval: (state) => (state.state.data?.items.some((item) => item.ongoing) ? 60_000 : false),
    retry: false,
  });

  return (
    <ManagedSection
      title="停机记录与补偿"
      description={nightly
        ? "每晚窗口内因机器或平台原因不可用的时段由平台自动记录；顺延补偿为补加一晚（同一组卡、同一窗口），同一晚多次停机只补一晚。"
        : "租期内因机器或平台原因不可用的时段由平台自动记录并补偿。"}
    >
      <SectionQueryState
        error={query.error}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取停机记录"
        notOpenText="停机记录接口暂未开放。如遇无法登录或资源异常，请通过工单联系平台。"
        onRetry={() => void query.refetch()}
      >
        {query.data ? <OutagesBody data={query.data} nightly={nightly} orderNo={orderNo} /> : null}
      </SectionQueryState>
    </ManagedSection>
  );
}

function OutagesBody({data, orderNo, nightly}: {data: OrderOutages; orderNo: string; nightly?: {extraNights: number | null}}) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
        <Fact label="当前补偿方式" value={remedyLabel(data.remedy, Boolean(nightly))} />
        {/* Nightly: extended_minutes is the summed outage time (fleet/outage_api.go:135), not the nights added;
            extra nights come from lease_end_at vs the booked end. */}
        {nightly
          ? <Fact label="已补加" value={nightly.extraNights === null ? "—" : `${nightly.extraNights} 晚`} />
          : <Fact label="已顺延" value={formatMinutes(data.extended_minutes)} />}
        <Fact label="待退费" value={formatFen(data.pending_refund_amount)} />
        <Fact label="本期计入停机" value={`${formatMinutes(data.term_outage_minutes)} / 租期 ${formatMinutes(data.term_minutes)}`} />
        <Fact label="本期最长单次" value={formatMinutes(data.longest_outage_minutes)} />
      </dl>
      <RemedyChooser data={data} nightly={Boolean(nightly)} orderNo={orderNo} />
      <OutageTable data={data} nightly={Boolean(nightly)} />
    </div>
  );
}

function RemedyChooser({data, orderNo, nightly}: {data: OrderOutages; orderNo: string; nightly: boolean}) {
  const client = useQueryClient();
  const [notice, setNotice] = useState<{tone: "info" | "error"; text: string} | null>(null);
  const mutation = useMutation({
    mutationFn: (remedy: OutageRemedy) => setOutageRemedy(orderNo, remedy),
    onSuccess: (next) => {
      client.setQueryData(managedOutagesKey(orderNo), next);
      setNotice({tone: "info", text: next.remedy === "refund" ? "已改为按比例退费，之后结束的停机将原路退款。" : `已改为${remedyLabel("extend", nightly)}。`});
    },
    onError: (error, remedy) => {
      // 50000 on refund = channel not confirmed; the backend still records refund_requested_at.
      const recorded = isBackendRequestError(error) && error.code === 50000 && remedy === "refund";
      setNotice({
        tone: recorded ? "info" : "error",
        text: recorded ? `${error.message}。已记录退费申请，当前按${remedyLabel("extend", nightly)}补偿。` : error.message || "补偿方式修改失败",
      });
      void client.invalidateQueries({queryKey: managedOutagesKey(orderNo)});
    },
  });

  if (!data.can_change_remedy) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted">
        租期已结束，补偿方式不能再修改；未补偿的停机将按比例退费。
      </p>
    );
  }

  const refundPending = data.refund_requested_at !== null && data.remedy === "extend";
  return (
    <div className="space-y-2 rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">补偿方式</span>
        <Button
          isDisabled={mutation.isPending || (data.remedy === "extend" && !refundPending)}
          size="sm"
          variant={data.remedy === "extend" ? "primary" : "outline"}
          onPress={() => mutation.mutate("extend")}
        >
          {refundPending ? `撤回退费申请，${remedyLabel("extend", nightly)}` : remedyLabel("extend", nightly)}
        </Button>
        <Button
          isDisabled={mutation.isPending || data.remedy === "refund" || !data.refund_eligible}
          size="sm"
          variant={data.remedy === "refund" ? "primary" : "outline"}
          onPress={() => mutation.mutate("refund")}
        >
          按比例退费
        </Button>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
        <li>修改只影响之后结束的停机，已结算的停机不变。</li>
        {data.refund_eligible ? null : <li>退费条件：{refundThresholdText(data)}；未达到时只能顺延。</li>}
        {data.refund_eligible && !data.refund_available ? (
          <li>退费通道尚未开放：选择退费将记录申请，补偿暂按顺延执行。</li>
        ) : null}
        {refundPending ? (
          <li>
            已于 {formatDateTime(data.refund_requested_at!)} 记录退费申请，当前按顺延补偿
            {data.refund_available ? "；退费通道已开放，如需退费请重新选择「按比例退费」" : ""}。
          </li>
        ) : null}
      </ul>
      {notice ? (
        <p className={`text-xs ${notice.tone === "error" ? "text-danger" : "text-foreground"}`} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}

function OutageTable({data, nightly}: {data: OrderOutages; nightly: boolean}) {
  if (!data.items.length) return <p className="text-sm text-muted">本租约暂无停机记录。</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="text-muted">
          <tr>
            <th className="py-2 pr-3 font-medium">开始</th>
            <th className="py-2 pr-3 font-medium">结束</th>
            <th className="py-2 pr-3 font-medium">时长</th>
            <th className="py-2 pr-3 font-medium">原因</th>
            <th className="py-2 pr-3 font-medium">责任方</th>
            <th className="py-2 font-medium">补偿</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr className="border-t border-border" key={item.id}>
              <td className="py-2 pr-3">{formatDateTime(item.started_at)}</td>
              <td className="py-2 pr-3">{item.ended_at ? formatDateTime(item.ended_at) : "进行中"}</td>
              <td className="py-2 pr-3">{formatMinutes(item.minutes)}</td>
              <td className="py-2 pr-3">{outageCauseCopy[item.cause] ?? item.cause}</td>
              <td className="py-2 pr-3">{outageLiableCopy[item.liable] ?? item.liable}</td>
              <td className="py-2">
                {outageItemStatus(item, nightly)}
                {item.remedy === "refund" && item.remedy_amount !== null ? ` · ${formatFen(item.remedy_amount)}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fact({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium break-all">{value}</dd>
    </div>
  );
}
