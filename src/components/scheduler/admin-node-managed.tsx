"use client";

import {Button} from "@heroui/react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {changeNodeSuspension, suspensionAction} from "@/lib/admin-managed";
import {formatDateTime} from "@/lib/format/date";
import {probeKindLabels, slotStateLabels, verifyStatusLabels} from "@/lib/managed-nodes";
import {notify} from "@/lib/notify";
import type {ComputeNode} from "@/lib/scheduler";

/** True when the list contains any SSH-managed node (push nodes also carry verify_status by DB default). */
export function hasManagedColumns(nodes: readonly ComputeNode[]) {
  return nodes.some((node) => node.mgmt_mode === "ssh");
}

/** verify_status / schedulable plus the fleet `managed` summary for one node (GET /admin/nodes). */
export function AdminNodeManagedCell({node}: {node: ComputeNode}) {
  if (node.mgmt_mode !== "ssh") return <span className="text-xs text-muted">推送模式</span>;
  const managed = node.managed;
  const probe = managed?.last_probe;
  const slots = Object.entries(managed?.slots ?? {}).filter(([, count]) => count > 0);
  return (
    <div className="space-y-0.5 text-xs">
      <p className="text-sm">{node.verify_status ? verifyStatusLabels[node.verify_status] : "未返回验证状态"}</p>
      {node.schedulable !== undefined ? (
        <p className={node.schedulable ? "text-muted" : "text-warning"}>{node.schedulable ? "接受新分配" : "已排空，不接新分配"}</p>
      ) : null}
      {!managed ? <p className="text-muted">托管摘要未返回（托管履约未启用）</p> : (
        <>
          <p className="text-muted">
            {probe
              ? `最近${probeKindLabels[probe.kind] ?? probe.kind} ${probe.result === "pass" ? "通过" : "未通过"} · ${formatDateTime(probe.created_at)}`
              : "尚无探活记录"}
          </p>
          {probe?.failed_checks.length ? <p className="text-danger">未通过：{probe.failed_checks.join("、")}</p> : null}
          {slots.length ? (
            <p className="text-muted">卡槽 {slots.map(([state, count]) => `${slotStateLabels[state as keyof typeof slotStateLabels] ?? state} ${count}`).join(" · ")}</p>
          ) : null}
          <p className="font-mono text-muted">{managed.ssh_host ? `${managed.ssh_host}:${managed.ssh_port ?? 22}` : "未填写 SSH"}</p>
          <p className={managed.host_key_confirmed ? "text-muted" : "text-warning"}>{managed.host_key_confirmed ? "主机指纹已钉死" : managed.host_key_fingerprint ? "主机指纹待确认" : "尚未观测主机指纹"}</p>
        </>
      )}
    </div>
  );
}

/** Operator suspend/resume; suspending does not affect existing leases (unless orders are frozen separately). */
export function AdminNodeSuspendButton({node}: {node: ComputeNode}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const action = node.mgmt_mode === "ssh" ? suspensionAction(node.verify_status) : null;
  const mutation = useMutation({
    mutationFn: (kind: "suspend" | "resume") => changeNodeSuspension(node.id, kind),
    onSuccess: async (_data, kind) => {
      setOpen(false);
      notify.success(kind === "suspend" ? "节点已停用" : "节点已恢复，已重新发起完整探活");
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
          : `恢复「${node.node_name}」后节点回到“待验证”并自动发起完整探活，通过后重新参与分配；操作写入审计。`}
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
