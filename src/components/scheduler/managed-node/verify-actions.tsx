"use client";

import {Button, Spinner} from "@heroui/react";
import {useMutation} from "@tanstack/react-query";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {errorMessage} from "@/lib/api/envelope";
import {confirmNodeReimage, hostKeyCheckCommand, setNodeDrain, startNodeVerify, type OnboardingStage} from "@/lib/managed-nodes";
import {notify} from "@/lib/notify";

/** Probe trigger, re-image confirmation and drain toggle for an SSH node (docs/25 §25.10). */
export function VerifyActions({nodeId, schedulable, onChanged, stage}: {nodeId: number; schedulable: boolean; onChanged: () => void; stage: OnboardingStage}) {
  const [confirmDrain, setConfirmDrain] = useState(false);
  const [newFingerprint, setNewFingerprint] = useState("");
  const verify = useMutation({
    mutationFn: () => startNodeVerify(nodeId),
    onSuccess: () => {notify.success("已提交探活，结果会在下方报告中更新"); onChanged();},
  });
  const reimage = useMutation({
    mutationFn: () => confirmNodeReimage(nodeId, newFingerprint),
    onSuccess: () => {notify.success("已确认重装，平台将自动完整探活"); onChanged();},
  });
  const drain = useMutation({
    mutationFn: (next: boolean) => setNodeDrain(nodeId, next),
    onSuccess: (_data, next) => {
      setConfirmDrain(false);
      notify.success(next ? "节点已排空，不再接新租约" : "节点已恢复接单");
      onChanged();
    },
  });
  const canVerify = stage === "verify" || stage === "failed" || stage === "verified";
  const mutationError = verify.error ?? reimage.error ?? (confirmDrain ? null : drain.error);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {stage === "verifying" ? (
          <span className="flex items-center gap-2 text-sm text-muted" role="status">
            <Spinner aria-hidden="true" size="sm" />探活进行中，页面会自动刷新
          </span>
        ) : null}
        {canVerify ? (
          <Button isPending={verify.isPending} onPress={() => verify.mutate()} variant={stage === "verify" ? "primary" : "outline"}>
            {stage === "verify" ? "开始探活" : "重新完整探活"}
          </Button>
        ) : null}
        {stage === "verified" || stage === "failed" ? (
          <Button isPending={drain.isPending && !confirmDrain} onPress={() => (schedulable ? setConfirmDrain(true) : drain.mutate(false))} variant="outline">
            {schedulable ? "排空节点" : "恢复接单"}
          </Button>
        ) : null}
      </div>
      {stage === "reimage" ? (
        <form
          className="space-y-2 rounded-xl border border-border p-3"
          onSubmit={(event) => { event.preventDefault(); reimage.mutate(); }}
        >
          <p className="text-xs leading-5 text-muted">
            整机租约已结束，须先重装系统清除买家数据，并重新放行平台管理公钥；然后在机器上执行
            <code className="mx-1 font-mono">{hostKeyCheckCommand}</code>，把输出的<strong>新</strong>指纹粘贴到下方。
            提交旧指纹会被拒绝；节点处于冻结核查时需等运营结案。此状态下修改连接信息或确认指纹不会解除「待重装」。
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="重装后的主机指纹"
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 font-mono text-sm"
              placeholder="SHA256:…"
              value={newFingerprint}
              onChange={(event) => setNewFingerprint(event.target.value)}
            />
            <Button isDisabled={!newFingerprint.trim()} isPending={reimage.isPending} type="submit">确认重装并重新探活</Button>
          </div>
        </form>
      ) : null}
      {mutationError ? <p className="text-sm text-danger" role="alert">{errorMessage(mutationError, "操作失败")}</p> : null}
      <ConfirmDialog
        confirmLabel="确认排空"
        description={`排空后节点不再接受新租约，进行中的租约照常运行到期。${drain.isError ? ` 操作失败：${errorMessage(drain.error)}` : ""}`}
        isPending={drain.isPending}
        onCancel={() => {setConfirmDrain(false); drain.reset();}}
        onConfirm={() => drain.mutate(true)}
        open={confirmDrain}
        title="排空该节点？"
      />
    </div>
  );
}
