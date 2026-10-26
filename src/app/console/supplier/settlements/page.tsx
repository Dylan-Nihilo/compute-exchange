"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, Label, ListBox, Select, Skeleton} from "@heroui/react";
import {ReceiptText} from "lucide";
import {useState} from "react";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";
import {
  fetchSupplierPaymentAccount,
  fetchSupplierSettlements,
  fetchSupplierSettlementSummary,
  paymentAccountStatusCopy,
  settlementStatusCopy,
  startSupplierPaymentAccount,
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
  {id: "cancelled", label: "已取消"},
  {id: "reversed", label: "已退回"},
] as const;

const statusTone: Record<string, string> = {
  pending: "bg-[#fff3e0] text-[#b25e09]",
  processing: "bg-[#e3f2fd] text-[#1d63ae]",
  success: "bg-[#e5f7d9] text-[#4c7c0f]",
  failed: "bg-[#fdeaea] text-[#c4392f]",
  cancelled: "bg-[#edf2f4] text-[#647c88]",
  reversed: "bg-[#edf2f4] text-[#647c88]",
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

      <PaymentAccountCard />

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
            <div className="omnis-scrollbar-x">
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
                        {item.status === "failed" && item.fail_reason ? (
                          <p className="mt-1 truncate text-[11px] text-[#c4392f]" title={item.fail_reason}>{item.fail_reason}</p>
                        ) : null}
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
              description="买家支付成功后生成结算流水, 交付确认且款项清算后经易宝分账到你的收款账户。"
              icon={ReceiptText}
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

// 收款账户: 供给方所得经易宝分账直接进入其易宝商户账户, 平台不经手资金。
function PaymentAccountCard() {
  const client = useQueryClient();
  const query = useQuery({queryKey: ["supplier", "payment-account"], queryFn: () => fetchSupplierPaymentAccount()});
  const start = useMutation({
    mutationFn: () => startSupplierPaymentAccount(),
    onSuccess: async (account) => {
      await client.invalidateQueries({queryKey: ["supplier", "payment-account"]});
      if (account.netin_url) window.location.assign(account.netin_url);
      else notify.error("暂未获取到开通链接，请稍后重试或联系平台运营");
    },
    onError: (error) => notify.error(error.message),
  });
  const account = query.data;
  const completed = account?.status === "completed";
  return (
    <GlassCard className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#173447]">易宝收款账户</p>
          {account ? (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${completed ? statusTone.success : account.status === "pending" ? statusTone.processing : statusTone.pending}`}>
              {paymentAccountStatusCopy[account.status]}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-[#78909c]">
          {query.isError
            ? "收款账户状态暂时无法读取。"
            : completed
              ? `商户编号 ${account?.merchant_no ?? "—"}。订单交付确认且款项清算后, 你的应得金额将经易宝自动分账至该账户。`
              : "订单款项由易宝支付托管, 开通易宝收款账户后才能接收分账。开通需提交企业资料并完成易宝审核与签约。"}
        </p>
        {account?.audit_opinion && !completed ? <p className="mt-1 text-xs text-[#c4392f]">审核意见：{account.audit_opinion}</p> : null}
      </div>
      {account && !completed ? (
        <Button className="shrink-0" isPending={start.isPending} onPress={() => start.mutate()}>
          {account.status === "pending" ? "继续开通" : "开通收款账户"}
        </Button>
      ) : null}
    </GlassCard>
  );
}
