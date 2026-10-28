"use client";

import {Button} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {adminLeaseStates, fetchAdminLeases, type LeaseFilter} from "@/lib/admin-managed";
import {formatDateTime} from "@/lib/format/date";
import {leaseStateCopy, remedyCopy} from "@/lib/managed-orders";

import {AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";

export const adminInputClass = "min-h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground";

/** GET /admin/leases?state=&node_id=&buyer_id= (docs/25 §25.10). */
export function AdminLeaseTable({onShowSessions}: {onShowSessions: (leaseNo: string) => void}) {
  const [filter, setFilter] = useState<LeaseFilter>({page: 1});
  const query = useQuery({queryKey: ["admin", "leases", filter], queryFn: () => fetchAdminLeases(filter), retry: false});
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 20));

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 sm:grid-cols-[180px_1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFilter({state: String(data.get("state") ?? ""), node_id: String(data.get("node_id") ?? ""), buyer_id: String(data.get("buyer_id") ?? ""), page: 1});
        }}
      >
        <select aria-label="租约状态" className={adminInputClass} name="state" defaultValue="">
          <option value="">全部状态</option>
          {adminLeaseStates.map((state) => <option key={state} value={state}>{leaseStateCopy[state] ?? state}</option>)}
        </select>
        <input aria-label="节点 ID" className={adminInputClass} inputMode="numeric" name="node_id" pattern="\d*" placeholder="节点 ID" />
        <input aria-label="买家 ID" className={adminInputClass} inputMode="numeric" name="buyer_id" pattern="\d*" placeholder="买家 ID" />
        <Button type="submit" variant="outline">检索</Button>
      </form>
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell
          emptyDescription="调整筛选条件后重试。"
          emptyTitle="暂无租约"
          error={query.isError ? query.error.message : undefined}
          isLoading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {query.data?.list.length ? (
            <table className={adminTableClass}>
              <caption className="sr-only">托管租约列表</caption>
              <AdminTableHead>
                <th scope="col">租约 / 订单</th><th scope="col">状态</th><th scope="col">节点 / 卡数</th><th scope="col">买家</th>
                <th scope="col">放行截止 / 宽限</th><th scope="col">异常</th><th scope="col">补偿方式</th><th scope="col">操作</th>
              </AdminTableHead>
              <tbody>
                {query.data.list.map((lease) => (
                  <tr key={lease.id}>
                    <th className="font-mono text-xs font-medium" scope="row">
                      {lease.lease_no}
                      <span className="mt-1 block font-sans text-muted">{lease.order_no ?? (lease.order_id ? `订单 #${lease.order_id}` : "—")}</span>
                    </th>
                    <td>{leaseStateCopy[lease.state] ?? lease.state}</td>
                    <td>{lease.node_name ?? `#${lease.node_id}`} · {lease.cards} 卡</td>
                    <td>#{lease.buyer_id}</td>
                    <td className="text-xs">
                      {lease.access_until ? formatDateTime(lease.access_until) : "—"}
                      {lease.grace_until ? <span className="block text-muted">宽限至 {formatDateTime(lease.grace_until)}</span> : null}
                    </td>
                    <td className="max-w-56 text-xs break-words">
                      {lease.resource_alert ? <span className="text-danger">{lease.resource_alert}</span> : null}
                      {lease.fail_reason ? <span className="block text-danger">{lease.fail_reason}</span> : null}
                      {!lease.resource_alert && !lease.fail_reason ? "—" : null}
                    </td>
                    <td>{lease.outage_remedy ? remedyCopy[lease.outage_remedy] : "—"}</td>
                    <td><Button size="sm" variant="tertiary" onPress={() => onShowSessions(lease.lease_no)}>查看会话</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </AdminTableShell>
      </AdminPanel>
      {pages > 1 ? <ListPagination page={filter.page ?? 1} totalPages={pages} onPageChange={(page) => setFilter({...filter, page})} /> : null}
    </div>
  );
}
