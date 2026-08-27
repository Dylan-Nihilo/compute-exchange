"use client";

import {useQuery} from "@tanstack/react-query";
import {Label, ListBox, Select, Skeleton} from "@heroui/react";
import {useState} from "react";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {formatDateTime} from "@/lib/format/date";
import {
  fetchSupplierSettlements,
  fetchSupplierSettlementSummary,
  settlementStatusCopy,
} from "@/lib/supplier-workspace";

const pageSize = 10;
const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

const statusOptions = [
  {id: "", label: "全部状态"},
  {id: "pending", label: "待结算"},
  {id: "processing", label: "结算中"},
  {id: "success", label: "已分账"},
  {id: "failed", label: "结算失败"},
] as const;

const statusTone: Record<string, string> = {
  pending: "bg-[#fff3e0] text-[#b25e09]",
  processing: "bg-[#e3f2fd] text-[#1d63ae]",
  success: "bg-[#e5f7d9] text-[#4c7c0f]",
  failed: "bg-[#fdeaea] text-[#c4392f]",
};

export default function SupplierSettlementsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const summaryQuery = useQuery({
    queryKey: ["supplier", "settlements", "summary"],
    queryFn: () => fetchSupplierSettlementSummary(),
  });
  const listQuery = useQuery({
    queryKey: ["supplier", "settlements", status, page],
    queryFn: () => fetchSupplierSettlements({status: status || undefined, page, pageSize}),
  });

  const summary = summaryQuery.data ?? {total_fen: 0, succeeded_fen: 0, pending_fen: 0};
  const totalPages = Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / pageSize));
  const settlements = listQuery.data?.settlements ?? [];

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader title="结算中心" />

      <div className="grid gap-3 sm:grid-cols-3">
        <GlassCard className="px-5 py-4">
          <p className="text-xs text-[#78909c]">应结总额</p>
          <p className="mt-2 text-2xl font-semibold text-[#173447]">
            {summaryQuery.isPending ? "…" : money.format(summary.total_fen / 100)}
          </p>
        </GlassCard>
        <GlassCard className="px-5 py-4">
          <p className="text-xs text-[#78909c]">已分账</p>
          <p className="mt-2 text-2xl font-semibold text-[#4c7c0f]">
            {summaryQuery.isPending ? "…" : money.format(summary.succeeded_fen / 100)}
          </p>
        </GlassCard>
        <GlassCard className="px-5 py-4">
          <p className="text-xs text-[#78909c]">待结算</p>
          <p className="mt-2 text-2xl font-semibold text-[#b25e09]">
            {summaryQuery.isPending ? "…" : money.format(summary.pending_fen / 100)}
          </p>
        </GlassCard>
      </div>

      <div className="w-56">
        <Label className="mb-2 block text-[13px] font-medium text-[#24495d]">状态</Label>
        <Select
          aria-label="按状态筛选结算"
          value={status}
          variant="secondary"
          onChange={(value) => {
            setStatus(String(value));
            setPage(1);
          }}
        >
          <Select.Trigger className="h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d]">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {statusOptions.map((option) => (
                <ListBox.Item id={option.id} key={option.id} textValue={option.label}>
                  {option.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      <GlassCard className="px-5 py-5 sm:px-6">
        <div aria-busy={listQuery.isPending} className="min-h-[320px]">
          {listQuery.isPending ? (
            <div className="space-y-3">
              {["s1", "s2", "s3", "s4"].map((key) => <Skeleton className="h-14 w-full rounded-xl" key={key} />)}
            </div>
          ) : listQuery.isError ? (
            <ErrorState
              description={listQuery.error instanceof Error ? listQuery.error.message : undefined}
              isPending={listQuery.isFetching}
              onRetry={() => void listQuery.refetch()}
              title="结算数据暂时不可用"
            />
          ) : settlements.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] table-fixed border-collapse text-left">
                <caption className="sr-only">结算流水</caption>
                <colgroup>
                  <col className="w-[190px]" />
                  <col className="w-[190px]" />
                  <col className="w-[130px]" />
                  <col className="w-[110px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">结算单号</th>
                    <th className="px-4" scope="col">关联订单</th>
                    <th className="px-4" scope="col">金额</th>
                    <th className="px-4" scope="col">状态</th>
                    <th className="rounded-r-[14px] px-4" scope="col">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((item) => (
                    <tr className="border-b border-[#dce9ee]/75 last:border-0" key={item.id}>
                      <th className="px-4 py-3.5 text-[13px] font-medium text-[#173447]" scope="row">
                        {item.settlement_id}
                      </th>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{item.order_no}</td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-[#173447]">
                        {money.format(item.amount / 100)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[item.status] ?? statusTone.pending}`}>
                          {settlementStatusCopy[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[12px] text-[#78909c]">
                        {formatDateTime(item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="订单完成分账后, 结算流水会显示在这里。当前分账尚未接入真实支付流水。"
              title="暂无结算记录"
            />
          )}
        </div>

        {!listQuery.isPending && !listQuery.isError ? (
          <div className="mt-4">
            <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : null}
      </GlassCard>
    </section>
  );
}
