"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {fetchDeadNodeTasks, nodeTaskKindCopy, retryNodeTask} from "@/lib/admin-managed";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";

import {AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";

const deadTasksKey = ["admin", "node-tasks", "dead"] as const;

/** Dead-letter node tasks (attempts exhausted) with manual retry (docs/25 §25.10). */
export function AdminDeadTasks() {
  const client = useQueryClient();
  const query = useQuery({queryKey: deadTasksKey, queryFn: () => fetchDeadNodeTasks(), retry: false});
  const retry = useMutation({
    mutationFn: (id: number) => retryNodeTask(id),
    onSuccess: async () => {
      notify.success("任务已重新入队");
      await client.invalidateQueries({queryKey: deadTasksKey});
    },
    onError: (error) => notify.error(error.message),
  });

  return (
    <AdminPanel className="overflow-hidden p-3 sm:p-4">
      <AdminTableShell
        emptyDescription="当前没有重试耗尽的节点任务。"
        emptyTitle="暂无死信任务"
        error={query.isError ? query.error.message : undefined}
        isLoading={query.isPending}
        onRetry={() => void query.refetch()}
      >
        {query.data?.list.length ? (
          <table className={adminTableClass}>
            <caption className="sr-only">死信节点任务</caption>
            <AdminTableHead>
              <th scope="col">任务</th><th scope="col">节点 / 租约 / 部署</th><th scope="col">尝试次数</th>
              <th scope="col">最近错误</th><th scope="col">更新时间</th><th scope="col">操作</th>
            </AdminTableHead>
            <tbody>
              {query.data.list.map((task) => (
                <tr key={task.id}>
                  <th className="font-medium" scope="row">
                    {nodeTaskKindCopy[task.kind] ?? task.kind}
                    <span className="mt-1 block font-mono text-xs font-normal text-muted">#{task.id} · {task.kind}</span>
                  </th>
                  <td className="text-xs">
                    节点 #{task.node_id}
                    {task.lease_id ? <span className="block text-muted">租约 #{task.lease_id}</span> : null}
                    {task.deployment_id ? <span className="block text-muted">部署 #{task.deployment_id}</span> : null}
                  </td>
                  <td>{task.attempts}{task.max_attempts ? ` / ${task.max_attempts}` : ""}</td>
                  <td className="max-w-72 text-xs break-words text-danger">{task.last_error ?? "—"}</td>
                  <td className="text-xs">{task.updated_at ? formatDateTime(task.updated_at) : "—"}</td>
                  <td>
                    <Button
                      isPending={retry.isPending && retry.variables === task.id}
                      isDisabled={retry.isPending}
                      size="sm"
                      variant="outline"
                      onPress={() => retry.mutate(task.id)}
                    >
                      重试
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </AdminTableShell>
    </AdminPanel>
  );
}
