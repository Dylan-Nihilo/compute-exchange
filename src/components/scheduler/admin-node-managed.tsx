"use client";

import {Button} from "@heroui/react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {changeNodeSuspension, suspensionAction} from "@/lib/admin-managed";
import {formatDateTime} from "@/lib/format/date";
import {verifyStatusLabels} from "@/lib/managed-nodes";
import {notify} from "@/lib/notify";
import type {ComputeNode} from "@/lib/scheduler";

/** True when the backend returns the v1.2 managed columns for any node in the list. */
export function hasManagedColumns(nodes: readonly ComputeNode[]) {
  return nodes.some((node) => node.mgmt_mode === "ssh" || node.verify_status !== undefined);
}

/** verify_status / schedulable / last probe summary for one node (docs/25 §25.10 GET /admin/nodes). */
export function AdminNodeManagedCell({node}: {node: ComputeNode}) {
  if (node.mgmt_mode !== "ssh" && node.verify_status === undefined) return <span className="text-xs text-muted">推送模式</span>;
  return (
    <div className="space-y-0.5 text-xs">
      <p className="text-sm">{node.verify_status ? verifyStatusLabels[node.verify_status] : "未返回验证状态"}</p>
      {node.schedulable !== undefined ? (
        <p className={node.schedulable ? "text-muted" : "text-warning"}>{node.schedulable ? "接受新分配" : "已排空，不接新分配"}</p>
      ) : null}
      <p className="text-muted">{node.last_probe_ok_at ? `探活通过 ${formatDateTime(node.last_probe_ok_at)}` : "尚无探活通过记录"}</p>
    </div>
  );
}

/** Operator suspend/resume; suspending does not affect existing leases (unless orders are frozen separately). */
export function AdminNodeSuspendButton({node}: {node: ComputeNode}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const action = suspensionAction(node.verify_status);
  const mutation = useMutation({
    mutationFn: (kind: "suspend" | "resume") => changeNodeSuspension(node.id, kind),
    onSuccess: async (_data, kind) => {
      setOpen(false);
      notify.success(kind === "suspend" ? "节点已停用" : "节点已恢复");
      await client.invalidateQueries({queryKey: ["scheduler"]});
    },
    onError: (error) => {
      setOpen(false);
      notify.error(error.message);
    },
  });
  if (!action) return null;
  return (
    <>
      <Button size="sm" variant={action === "suspend" ? "danger-soft" : "outline"} onPress={() => setOpen(true)}>
        {action === "suspend" ? "停用" : "恢复"}
      </Button>
      <ConfirmDialog
        confirmLabel={action === "suspend" ? "停用节点" : "恢复节点"}
        description={action === "suspend"
          ? `停用「${node.node_name}」后不再分配新租约，存量租约照常运行至到期；操作写入审计。`
          : `恢复「${node.node_name}」为已验证状态，重新参与分配；操作写入审计。`}
        isDestructive={action === "suspend"}
        isPending={mutation.isPending}
        open={open}
        title={action === "suspend" ? "停用节点" : "恢复节点"}
        onCancel={() => setOpen(false)}
        onConfirm={() => mutation.mutate(action)}
      />
    </>
  );
}
