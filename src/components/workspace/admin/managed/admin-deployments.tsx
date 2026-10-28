"use client";

import {Button} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {fetchAdminDeployments, type DeploymentFilter} from "@/lib/admin-managed";
import {formatDateTime} from "@/lib/format/date";
import {deployStateCopy, deployStates, healthCopy} from "@/lib/model-deploy";

import {AdminPage, AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";
import {adminInputClass} from "./admin-lease-table";

const HEALTH_TONE: Record<string, string> = {healthy: "text-success", degraded: "text-warning", unhealthy: "text-danger"};

/** GET /admin/deployments?state=&health= (docs/27 §27.8 运营). Read-only global view. */
export function AdminDeployments() {
  const [filter, setFilter] = useState<DeploymentFilter>({page: 1});
  const query = useQuery({queryKey: ["admin", "deployments", filter], queryFn: () => fetchAdminDeployments(filter), retry: false});
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 20));

  return (
    <AdminPage description="全局查看买家在托管租约上的模型部署、健康状态与失败原因。" eyebrow="Model deployments" title="部署总览">
      <form
        className="grid gap-3 sm:grid-cols-[200px_200px_auto]"
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
          <option value="">全部健康状态</option>
          {Object.entries(healthCopy).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button className="justify-self-start" type="submit" variant="outline">检索</Button>
      </form>
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell
          emptyDescription="调整筛选条件后重试。"
          emptyTitle="暂无部署"
          error={query.isError ? query.error.message : undefined}
          isLoading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {query.data?.list.length ? (
            <table className={adminTableClass}>
              <caption className="sr-only">模型部署列表</caption>
              <AdminTableHead>
                <th scope="col">部署</th><th scope="col">模型</th><th scope="col">租约 / 节点</th><th scope="col">并行</th>
                <th scope="col">状态</th><th scope="col">健康</th><th scope="col">重启</th><th scope="col">失败原因</th>
              </AdminTableHead>
              <tbody>
                {query.data.list.map((item) => (
                  <tr key={item.deploy_no}>
                    <th className="font-mono text-xs font-medium" scope="row">
                      {item.deploy_no}
                      <span className="mt-1 block font-sans text-muted">{item.created_at ? formatDateTime(item.created_at) : "—"}</span>
                    </th>
                    <td className="text-xs">
                      {item.display_name ?? item.model_key ?? (item.model_id ? `#${item.model_id}` : "—")}
                      {item.display_name && item.model_key ? <span className="block font-mono text-muted">{item.model_key}</span> : null}
                    </td>
                    <td className="text-xs">
                      {item.lease_no ?? (item.lease_id ? `租约 #${item.lease_id}` : "—")}
                      <span className="block text-muted">
                        {item.node_name ?? (item.node_id ? `节点 #${item.node_id}` : "")}
                        {item.buyer_id ? ` · 买家 #${item.buyer_id}` : ""}
                      </span>
                    </td>
                    <td className="text-xs">TP {item.tp} × DP {item.dp}<span className="block text-muted">上下文 {item.max_model_len.toLocaleString("zh-CN")}</span></td>
                    <td>{deployStateCopy[item.state] ?? item.state}</td>
                    <td className="text-xs">
                      <span className={HEALTH_TONE[item.health] ?? "text-muted"}>{healthCopy[item.health] ?? item.health}</span>
                      {item.health_reason ? <span className="block font-mono text-muted">{item.health_reason}</span> : null}
                    </td>
                    <td className="text-xs">
                      {item.restart_count ?? 0}
                      {item.last_restart_at ? <span className="block text-muted">{formatDateTime(item.last_restart_at)}</span> : null}
                    </td>
                    <td className="max-w-64 text-xs break-words text-danger">{item.fail_reason ?? <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </AdminTableShell>
      </AdminPanel>
      {pages > 1 ? <ListPagination page={filter.page ?? 1} totalPages={pages} onPageChange={(page) => setFilter({...filter, page})} /> : null}
    </AdminPage>
  );
}
