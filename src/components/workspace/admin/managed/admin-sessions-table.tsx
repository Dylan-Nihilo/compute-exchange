"use client";

import {Button} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {ADMIN_PAGE_SIZE, fetchAdminSessions} from "@/lib/admin-managed";
import {formatDateTime} from "@/lib/format/date";
import {formatBytes} from "@/lib/managed-orders";

import {AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";
import {adminInputClass} from "./admin-lease-table";

/** Gateway session audit: GET /admin/access-sessions?lease_no=&ip=&page=&page_size= (fleet AdminSessions). */
export function AdminSessionsTable({initialLeaseNo}: {initialLeaseNo: string}) {
  const [filter, setFilter] = useState({lease_no: initialLeaseNo, ip: "", page: 1});
  const query = useQuery({queryKey: ["admin", "access-sessions", filter], queryFn: () => fetchAdminSessions(filter), retry: false});
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / ADMIN_PAGE_SIZE));

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFilter({lease_no: String(data.get("lease_no") ?? "").trim(), ip: String(data.get("ip") ?? "").trim(), page: 1});
        }}
      >
        <input aria-label="租约号" className={adminInputClass} defaultValue={initialLeaseNo} maxLength={10} name="lease_no" placeholder="租约号 l-xxxxxxxx" />
        <input aria-label="来源 IP" className={adminInputClass} maxLength={45} name="ip" placeholder="来源 IP" />
        <Button type="submit" variant="outline">检索</Button>
      </form>
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell
          emptyDescription="按租约号或来源 IP 检索网关会话。"
          emptyTitle="暂无会话记录"
          error={query.isError ? query.error.message : undefined}
          isLoading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {query.data?.list.length ? (
            <table className={adminTableClass}>
              <caption className="sr-only">网关会话审计</caption>
              <AdminTableHead>
                <th scope="col">租约 / 买家</th><th scope="col">来源 IP</th><th scope="col">认证方式</th><th scope="col">开始 / 结束</th>
                <th scope="col">上行 / 下行</th><th scope="col">结束原因</th>
              </AdminTableHead>
              <tbody>
                {query.data.list.map((session) => (
                  <tr key={session.id}>
                    <th className="font-mono text-xs font-medium" scope="row">
                      {session.lease_no}
                      <span className="mt-1 block font-sans text-muted">买家 #{session.buyer_id}</span>
                    </th>
                    <td className="font-mono text-xs">{session.remote_ip}</td>
                    <td className="text-xs">
                      {session.auth_method === "publickey" ? "公钥" : session.auth_method === "password" ? "密码" : session.auth_method}
                      {session.key_name ? <span className="block text-muted">{session.key_name}</span> : null}
                      {session.key_fingerprint ? <span className="block font-mono break-all text-muted">{session.key_fingerprint}</span> : null}
                    </td>
                    <td className="text-xs">
                      {formatDateTime(session.started_at)}
                      <span className="block text-muted">{session.ended_at ? formatDateTime(session.ended_at) : "进行中"}</span>
                    </td>
                    <td className="text-xs">{formatBytes(session.bytes_up)} / {formatBytes(session.bytes_down)}</td>
                    <td className="text-xs">{session.end_reason ?? "—"}</td>
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
