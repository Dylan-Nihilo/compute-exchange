"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {OptionChips} from "@/components/managed/option-chips";
import {SectionQueryState} from "@/components/managed/query-states";
import {formatDateTime} from "@/lib/format/date";
import {
  canChooseRemedy,
  fetchLeaseOutages,
  liableCopy,
  outageCauseCopy,
  remedyCopy,
  setOutageRemedy,
  type LeaseOutage,
  type OutageRemedy,
} from "@/lib/managed-orders";
import {notify} from "@/lib/notify";

import {managedAccessKey} from "./managed-access-card";
import {ManagedSection} from "./managed-section";

const money = new Intl.NumberFormat("zh-CN", {currency: "CNY", style: "currency"});

/**
 * Lease outages (docs/25 §25.7.6) and the buyer's compensation choice. The backend message
 * for a rejected choice (e.g. 50000 while Yeepay partial refunds are unconfirmed, 40900 after
 * the lease ended) is shown exactly as returned.
 */
export function ManagedOutagesCard({orderNo, leaseState, accessRemedy}: {
  orderNo: string;
  leaseState?: string;
  accessRemedy?: OutageRemedy | null;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["buyer", "orders", "managed-outages", orderNo];
  const query = useQuery({queryKey, queryFn: () => fetchLeaseOutages(orderNo), retry: false});
  const remedy = useMutation({
    mutationFn: (value: OutageRemedy) => setOutageRemedy(orderNo, value),
    onSuccess: async (_data, value) => {
      notify.success(`补偿方式已设为${remedyCopy[value]}`);
      await Promise.all([
        queryClient.invalidateQueries({queryKey}),
        queryClient.invalidateQueries({queryKey: managedAccessKey(orderNo)}),
      ]);
    },
  });
  const outages = query.data?.outages ?? [];
  // docs/25: the lease defaults to "extend" until the buyer chooses otherwise.
  const current = query.data?.remedy ?? accessRemedy ?? "extend";
  const editable = leaseState === undefined || canChooseRemedy(leaseState);

  return (
    <ManagedSection title="停机记录与补偿" description="租期内因机器原因不可用的时段由平台自动记录。">
      <SectionQueryState
        emptyText="本租约暂无停机记录。"
        error={query.error}
        isEmpty={outages.length === 0}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取停机记录"
        notOpenText="停机记录接口暂未开放。"
        onRetry={() => void query.refetch()}
      >
        <div className="space-y-4">
          <div>
            <OptionChips
              items={(["extend", "refund"] as const).map((value) => ({
                value,
                label: remedyCopy[value],
                disabled: !editable || remedy.isPending,
              }))}
              label="补偿方式（租期结束前可修改，未选择时按顺延处理）"
              value={remedy.isPending ? (remedy.variables ?? current) : current}
              onChange={(value) => {
                if (value !== current) remedy.mutate(value);
              }}
            />
            {!editable ? <p className="mt-2 text-xs text-muted">租期已结束，剩余未补偿的停机按退费结算。</p> : null}
            {remedy.isError ? <p className="mt-2 text-sm text-danger" role="alert">{remedy.error.message}</p> : null}
          </div>
          <ul className="divide-y divide-border">
            {outages.map((outage) => <OutageRow key={outage.id} outage={outage} />)}
          </ul>
        </div>
      </SectionQueryState>
    </ManagedSection>
  );
}

function OutageRow({outage}: {outage: LeaseOutage}) {
  return (
    <li className="grid gap-1 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {outageCauseCopy[outage.cause] ?? outage.cause}
          <span className="ml-2 text-xs font-normal text-muted">责任方：{liableCopy[outage.liable] ?? outage.liable}</span>
        </p>
        <p className="mt-1 text-muted">
          {formatDateTime(outage.started_at)} — {outage.ended_at ? formatDateTime(outage.ended_at) : "尚未恢复"}
          {outage.minutes != null ? ` · ${outage.minutes} 分钟` : ""}
        </p>
      </div>
      <p className="text-muted sm:text-right">{remedyResult(outage)}</p>
    </li>
  );
}

function remedyResult(outage: LeaseOutage) {
  if (!outage.ended_at) return "停机中，恢复后结算";
  if (!outage.remedy_applied_at) return outage.remedy ? `待${remedyCopy[outage.remedy]}` : "待结算";
  if (outage.remedy === "refund") {
    return outage.remedy_amount != null ? `已退还 ${money.format(outage.remedy_amount / 100)}` : "已退还费用";
  }
  return outage.remedy === "extend" ? "已顺延时长" : "已结算";
}
