"use client";

import {Button} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {ADMIN_PAGE_SIZE} from "@/lib/admin-managed";
import {fetchPartialRefunds, partialRefundKindCopy, partialRefundStatusCopy, partialRefundStatuses} from "@/lib/admin-outages";
import {formatDateTime} from "@/lib/format/date";
import {formatFen} from "@/lib/managed-orders";

import {AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";
import {adminInputClass} from "./admin-lease-table";

/** GET /admin/payment/partial-refunds (T-106): outage-compensation and supplier-breach partial refunds. */
export function AdminPartialRefunds() {
  const [filter, setFilter] = useState<{status?: string; order_no?: string; page: number}>({page: 1});
  const query = useQuery({queryKey: ["admin", "partial-refunds", filter], queryFn: () => fetchPartialRefunds(filter), retry: false});
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / ADMIN_PAGE_SIZE));
  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 sm:grid-cols-[180px_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFilter({status: String(data.get("status") ?? ""), order_no: String(data.get("order_no") ?? ""), page: 1});
        }}
      >
        <select aria-label="退款状态" className={adminInputClass} defaultValue="" name="status">
          <option value="">全部状态</option>
          {partialRefundStatuses.map((status) => <option key={status} value={status}>{partialRefundStatusCopy[status]}</option>)}
        </select>
        <input aria-label="订单号" className={adminInputClass} name="order_no" placeholder="订单号" />
        <Button type="submit" variant="outline">检索</Button>
      </form>
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell
          emptyDescription="停机退费或供给方违约退款发起后会出现在这里。"
          emptyTitle="暂无部分退款"
          error={query.isError ? query.error.message : undefined}
          isLoading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {query.data?.list.length ? (
            <table className={adminTableClass}>
              <caption className="sr-only">部分退款列表</caption>
              <AdminTableHead>
                <th scope="col">订单 / 请求号</th><th scope="col">类型</th><th scope="col">金额</th><th scope="col">状态</th>
                <th scope="col">易宝退款单号</th><th scope="col">原因 / 错误</th><th scope="col">更新时间</th>
              </AdminTableHead>
              <tbody>
                {query.data.list.map((row) => (
                  <tr key={row.id}>
                    <th className="font-mono text-xs font-medium" scope="row">{row.order_no}<span className="mt-1 block text-muted">{row.refund_request_id}</span></th>
                    <td className="text-xs">{partialRefundKindCopy[row.kind] ?? row.kind}</td>
                    <td>{formatFen(row.amount)}</td>
                    <td className={row.status === "failed" ? "text-xs text-danger" : "text-xs"}>{partialRefundStatusCopy[row.status]}</td>
                    <td className="font-mono text-xs">{row.yeepay_refund_no ?? "—"}</td>
                    <td className="max-w-64 text-xs break-words">
                      {row.reason ?? "—"}
                      {row.last_error ? <span className="block text-danger">{row.last_error}</span> : null}
                    </td>
                    <td className="text-xs">{formatDateTime(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </AdminTableShell>
      </AdminPanel>
      {pages > 1 ? <ListPagination page={filter.page} totalPages={pages} onPageChange={(page) => setFilter({...filter, page})} /> : null}
    </div>
  );
}
