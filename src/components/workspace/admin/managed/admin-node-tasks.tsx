"use client";

import {Button} from "@heroui/react";
import {keepPreviousData, useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {
  ADMIN_PAGE_SIZE,
  canRetryNodeTask,
  fetchNodeTasks,
  nodeTaskKindCopy,
  nodeTaskStateCopy,
  nodeTaskStates,
  retryNodeTask,
  type NodeTaskFilter,
  type NodeTaskState,
} from "@/lib/admin-managed";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";

import {AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";
import {adminInputClass} from "./admin-lease-table";

const tasksKey = ["admin", "node-tasks"] as const;

function isTaskState(value: string): value is NodeTaskState {
  return (nodeTaskStates as readonly string[]).includes(value);
}

/**
 * Node task queue: GET /admin/node-tasks?state=&node_id= (defaults to dead letters) with manual retry
 * for dead non-provision tasks (POST /admin/node-tasks/:id/retry). Backend 40900 messages are shown as-is.
 */
export function AdminNodeTasks() {
  const client = useQueryClient();
  const [filter, setFilter] = useState<NodeTaskFilter>({state: "dead", page: 1});
  const query = useQuery({
    queryKey: [...tasksKey, filter],
    queryFn: () => fetchNodeTasks(filter),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / ADMIN_PAGE_SIZE));
  const retry = useMutation({
    mutationFn: (id: number) => retryNodeTask(id),
    onSuccess: async (result) => {
      notify.success(`任务 #${result.task_id} 已重新入队`);
      await client.invalidateQueries({queryKey: tasksKey});
    },
    onError: async (error) => {
      notify.error(error.message);
      // 40900 "任务状态已变化" etc.: the row is stale, refresh it.
      await client.invalidateQueries({queryKey: tasksKey});
    },
  });

  return (
    <div className="space-y-4">
      <form
        className="grid gap-3 sm:grid-cols-[180px_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const state = String(data.get("state") ?? "");
          setFilter({state: isTaskState(state) ? state : "", node_id: String(data.get("node_id") ?? "").trim(), page: 1});
        }}
      >
        <select aria-label="任务状态" className={adminInputClass} defaultValue="dead" name="state">
          <option value="">全部状态</option>
          {nodeTaskStates.map((state) => <option key={state} value={state}>{nodeTaskStateCopy[state]}</option>)}
        </select>
        <input aria-label="节点 ID" className={adminInputClass} inputMode="numeric" name="node_id" pattern="\d*" placeholder="节点 ID" />
        <Button type="submit" variant="outline">检索</Button>
      </form>
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell
          emptyDescription={filter.state === "dead" ? "当前没有重试耗尽的节点任务。" : "调整筛选条件后重试。"}
          emptyTitle="暂无节点任务"
          error={query.isError ? query.error.message : undefined}
          isLoading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {query.data?.list.length ? (
            <table className={adminTableClass}>
              <caption className="sr-only">节点任务</caption>
              <AdminTableHead>
                <th scope="col">任务</th><th scope="col">状态</th><th scope="col">节点 / 租约 / 部署</th><th scope="col">尝试次数</th>
                <th scope="col">最近错误</th><th scope="col">时间</th><th scope="col">操作</th>
              </AdminTableHead>
              <tbody>
                {query.data.list.map((task) => (
                  <tr key={task.id}>
                    <th className="font-medium" scope="row">
                      {nodeTaskKindCopy[task.kind] ?? task.kind}
                      <span className="mt-1 block font-mono text-xs font-normal text-muted">#{task.id} · {task.kind} · 优先级 {task.priority}</span>
                    </th>
                    <td className={task.state === "dead" ? "text-danger" : undefined}>{nodeTaskStateCopy[task.state]}</td>
                    <td className="text-xs">
                      节点 #{task.node_id}
                      {task.lease_id ? <span className="block text-muted">租约 #{task.lease_id}</span> : null}
                      {task.deployment_id ? <span className="block text-muted">部署 #{task.deployment_id}</span> : null}
                    </td>
                    <td>{task.attempts} / {task.max_attempts}</td>
                    <td className="max-w-72 text-xs break-words text-danger">{task.last_error ?? <span className="text-muted">—</span>}</td>
                    <td className="text-xs">
                      更新 {formatDateTime(task.updated_at)}
                      {task.state === "pending" || task.state === "failed" ? <span className="block text-muted">计划执行 {formatDateTime(task.run_after)}</span> : null}
                      {task.locked_until ? <span className="block text-muted">锁定至 {formatDateTime(task.locked_until)}</span> : null}
                    </td>
                    <td>
                      {canRetryNodeTask(task) ? (
                        <Button
                          isDisabled={retry.isPending}
                          isPending={retry.isPending && retry.variables === task.id}
                          size="sm"
                          variant="outline"
                          onPress={() => retry.mutate(task.id)}
                        >
                          重试
                        </Button>
                      ) : task.state === "dead" && task.kind === "provision" ? (
                        <span className="text-xs text-muted">已自动善后</span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
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
