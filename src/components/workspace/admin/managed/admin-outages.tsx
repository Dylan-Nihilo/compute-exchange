"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {ADMIN_PAGE_SIZE} from "@/lib/admin-managed";
import {adminOutageStatus, createSupplierBreachRefund, fetchAdminOutages, outageCauses, type OutageFilter} from "@/lib/admin-outages";
import {formatDateTime} from "@/lib/format/date";
import {formatFen, formatMinutes, outageCauseCopy, outageLiableCopy} from "@/lib/managed-orders";

import {AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";
import {adminInputClass} from "./admin-lease-table";

/** GET /admin/lease-outages (T-105) plus the supplier-breach refund form (T-106). */
export function AdminOutages() {
  const [filter, setFilter] = useState<OutageFilter>({page: 1});
  const query = useQuery({queryKey: ["admin", "lease-outages", filter], queryFn: () => fetchAdminOutages(filter), retry: false});
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / ADMIN_PAGE_SIZE));

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_160px_120px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFilter({
            lease_no: String(data.get("lease_no") ?? ""),
            order_no: String(data.get("order_no") ?? ""),
            cause: String(data.get("cause") ?? ""),
            supplier_id: String(data.get("supplier_id") ?? ""),
            open: data.get("open") === "on",
            refund_pending: data.get("refund_pending") === "on",
            page: 1,
          });
        }}
      >
        <input aria-label="租约号" className={adminInputClass} name="lease_no" placeholder="租约号 l-xxxxxxxx" />
        <input aria-label="订单号" className={adminInputClass} name="order_no" placeholder="订单号（原单或续租单）" />
        <select aria-label="停机原因" className={adminInputClass} defaultValue="" name="cause">
          <option value="">全部原因</option>
          {outageCauses.map((cause) => <option key={cause} value={cause}>{outageCauseCopy[cause] ?? cause}</option>)}
        </select>
        <input aria-label="供给方 ID" className={adminInputClass} inputMode="numeric" name="supplier_id" pattern="\d*" placeholder="供给方 ID" />
        <Button type="submit" variant="outline">检索</Button>
        <div className="flex flex-wrap gap-4 text-sm sm:col-span-3 lg:col-span-5">
          <label className="flex items-center gap-2"><input name="open" type="checkbox" />仅进行中</label>
          <label className="flex items-center gap-2"><input name="refund_pending" type="checkbox" />仅待退费</label>
        </div>
      </form>
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell
          emptyDescription="调整筛选条件后重试。"
          emptyTitle="暂无停机记录"
          error={query.isError ? query.error.message : undefined}
          isLoading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {query.data?.list.length ? (
            <table className={adminTableClass}>
              <caption className="sr-only">租约停机记录</caption>
              <AdminTableHead>
                <th scope="col">租约 / 订单</th><th scope="col">原因 / 责任</th><th scope="col">起止</th><th scope="col">时长</th>
                <th scope="col">补偿</th><th scope="col">责任金额</th><th scope="col">认定原文</th>
              </AdminTableHead>
              <tbody>
                {query.data.list.map((item) => (
                  <tr key={item.id}>
                    <th className="font-mono text-xs font-medium" scope="row">
                      {item.lease_no}
                      <span className="mt-1 block">{item.order_no}</span>
                      <span className="block font-sans text-muted">
                        {item.node_id ? `节点 #${item.node_id}` : "无节点"}{item.supplier_id ? ` · 供给方 #${item.supplier_id}` : ""}
                      </span>
                    </th>
                    <td className="text-xs">
                      {outageCauseCopy[item.cause] ?? item.cause}
                      <span className="block text-muted">{outageLiableCopy[item.liable] ?? item.liable}责任</span>
                    </td>
                    <td className="text-xs">
                      {formatDateTime(item.started_at)}
                      <span className="block text-muted">{item.ended_at ? formatDateTime(item.ended_at) : "进行中"}</span>
                    </td>
                    <td className="text-xs">{item.minutes === null ? "—" : formatMinutes(item.minutes)}</td>
                    <td className="text-xs">
                      {adminOutageStatus(item)}
                      {item.remedy_amount !== null && item.remedy === "refund" ? <span className="block">{formatFen(item.remedy_amount)}</span> : null}
                    </td>
                    <td className="text-xs">{item.liability_amount === null ? "—" : formatFen(item.liability_amount)}</td>
                    <td className="max-w-64 text-xs break-words text-muted">{item.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </AdminTableShell>
      </AdminPanel>
      {pages > 1 ? <ListPagination page={filter.page ?? 1} totalPages={pages} onPageChange={(page) => setFilter({...filter, page})} /> : null}
      <BreachRefundForm />
    </div>
  );
}

function BreachRefundForm() {
  const [confirming, setConfirming] = useState<{order_no: string; reason: string} | null>(null);
  const mutation = useMutation({mutationFn: (input: {order_no: string; reason: string}) => createSupplierBreachRefund(input.order_no, input.reason)});
  return (
    <AdminPanel className="space-y-3 p-4 sm:p-5">
      <div>
        <p className="text-sm font-medium">供给方违约未使用部分退款</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          仅当本期供给方责任停机达到退费门槛时可发起；提交后访问期限立即截断到当前时刻，按剩余访问时长原路部分退款，每个租约最多一次。请填写托管原订单号。
        </p>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          mutation.reset();
          setConfirming({order_no: String(data.get("order_no") ?? "").trim(), reason: String(data.get("reason") ?? "").trim()});
        }}
      >
        <input aria-label="原订单号" className={adminInputClass} name="order_no" placeholder="原订单号" required />
        <input aria-label="违约原因" className={adminInputClass} name="reason" placeholder="违约原因（必填）" required />
        <Button type="submit" variant="outline">发起</Button>
      </form>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning px-3 py-2 text-sm" role="alert">
          <span>确认对订单 {confirming.order_no} 发起违约退款？买家访问将立即结束。</span>
          <Button isPending={mutation.isPending} size="sm" variant="danger-soft" onPress={() => { mutation.mutate(confirming); setConfirming(null); }}>确认发起</Button>
          <Button size="sm" variant="ghost" onPress={() => setConfirming(null)}>取消</Button>
        </div>
      ) : null}
      {mutation.isError ? <p className="text-sm text-danger" role="alert">{mutation.error.message}</p> : null}
      {mutation.data ? (
        <p className="text-sm" role="status">
          已登记退款 {formatFen(mutation.data.amount)}（退款单 #{mutation.data.refund_id}，所属订单 {mutation.data.refund_order_no}），访问截止 {formatDateTime(mutation.data.access_until)}。
        </p>
      ) : null}
    </AdminPanel>
  );
}
