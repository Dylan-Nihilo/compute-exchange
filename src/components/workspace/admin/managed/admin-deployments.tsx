"use client";

import {Button} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {ADMIN_PAGE_SIZE} from "@/lib/admin-managed";
import {formatDateTime} from "@/lib/format/date";
import {deployStateCopy, deployStates, fetchAdminDeployments, healthCopy} from "@/lib/model-deploy";

import {AdminPage, AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";
import {adminInputClass} from "./admin-lease-table";

const healthValues = ["unknown", "healthy", "degraded", "unhealthy"] as const;

/** Global deployment view (GET /admin/deployments?state=&health=&page=&page_size=, handler_deploy.go:153). */
export function AdminDeployments() {
  const [filter, setFilter] = useState<{state?: string; health?: string; page: number}>({page: 1});
  const query = useQuery({
    queryKey: ["admin", "deployments", filter],
    queryFn: () => fetchAdminDeployments({...filter, pageSize: ADMIN_PAGE_SIZE}),
    retry: false,
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / ADMIN_PAGE_SIZE));

  return (
    <AdminPage description="全局查看买家在托管租约上的模型部署、健康状态与失败原因。" eyebrow="Model deployments" title="部署总览">
      <div className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-[180px_180px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setFilter({state: String(data.get("state") ?? ""), health: String(data.get("health") ?? ""), page: 1});
          }}
        >
          <select aria-label="部署状态" className={adminInputClass} defaultValue="" name="state">
            <option value="">全部状态</option>
            {deployStates.map((state) => <option key={state} value={state}>{deployStateCopy[state]}</option>)}
          </select>
          <select aria-label="健康状态" className={adminInputClass} defaultValue="" name="health">
            <option value="">全部健康</option>
            {healthValues.map((value) => <option key={value} value={value}>{healthCopy[value]}</option>)}
          </select>
          <Button type="submit" variant="outline">检索</Button>
        </form>
        <AdminPanel className="overflow-hidden p-3 sm:p-4">
          <AdminTableShell
            emptyDescription="买家在托管租约上提交一键部署后会出现在这里。"
            emptyTitle="暂无部署"
            error={query.isError ? query.error.message : undefined}
            isLoading={query.isPending}
            onRetry={() => void query.refetch()}
          >
            {query.data?.list.length ? (
              <table className={adminTableClass}>
                <caption className="sr-only">模型部署列表</caption>
                <AdminTableHead>
                  <th scope="col">部署 / 订单</th><th scope="col">模型</th><th scope="col">买家 / 节点</th><th scope="col">并行</th>
                  <th scope="col">状态</th><th scope="col">健康</th><th scope="col">原因</th><th scope="col">更新时间</th>
                </AdminTableHead>
                <tbody>
                  {query.data.list.map((row) => (
                    <tr key={row.deploy_no}>
                      <th className="font-mono text-xs font-medium" scope="row">
                        {row.deploy_no}
                        <span className="mt-1 block text-muted">{row.order_no}</span>
                      </th>
                      <td className="text-xs">
                        {row.model.display_name || row.model.model_key}
                        <span className="block font-mono text-muted">{row.model.model_key}</span>
                      </td>
                      <td className="text-xs">
                        {row.buyer_id ? `买家 #${row.buyer_id}` : "—"}
                        <span className="block text-muted">{row.node_id ? `节点 #${row.node_id}` : "未分配节点"}</span>
                      </td>
                      <td className="text-xs">TP{row.tp} × DP{row.dp}</td>
                      <td className={row.state === "failed" ? "text-xs text-danger" : "text-xs"}>
                        {deployStateCopy[row.state] ?? row.state}
                        {row.restart_count ? <span className="block text-muted">自动重启 {row.restart_count} 次</span> : null}
                      </td>
                      <td className="text-xs">{healthCopy[row.health] ?? row.health}</td>
                      <td className="max-w-64 text-xs break-words text-muted">
                        {row.fail_reason ?? row.health_reason_text ?? row.stop_reason ?? "—"}
                        {row.health_reason ? <span className="block font-mono">{row.health_reason}</span> : null}
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
    </AdminPage>
  );
}
