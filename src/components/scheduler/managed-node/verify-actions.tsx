"use client";

import {Button, Spinner} from "@heroui/react";
import {useMutation} from "@tanstack/react-query";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {errorMessage} from "@/lib/api/envelope";
import {confirmNodeReimage, setNodeDrain, startNodeVerify, type OnboardingStage} from "@/lib/managed-nodes";
import {notify} from "@/lib/notify";

/** Probe trigger, re-image confirmation and drain toggle for an SSH node (docs/25 §25.10). */
export function VerifyActions({nodeId, schedulable, onChanged, stage}: {nodeId: number; schedulable: boolean; onChanged: () => void; stage: OnboardingStage}) {
  const [confirmDrain, setConfirmDrain] = useState(false);
  const verify = useMutation({
    mutationFn: () => startNodeVerify(nodeId),
    onSuccess: () => {notify.success("已提交探活，结果会在下方报告中更新"); onChanged();},
  });
  const reimage = useMutation({
    mutationFn: () => confirmNodeReimage(nodeId),
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
        {stage === "reimage" ? (
          <Button isPending={reimage.isPending} onPress={() => reimage.mutate()}>我已重装系统，确认并重新探活</Button>
        ) : null}
        {stage === "verified" || stage === "failed" ? (
          <Button isPending={drain.isPending && !confirmDrain} onPress={() => (schedulable ? setConfirmDrain(true) : drain.mutate(false))} variant="outline">
            {schedulable ? "排空节点" : "恢复接单"}
          </Button>
        ) : null}
      </div>
      {stage === "reimage" ? (
        <p className="text-xs leading-5 text-muted">整机租约结束后，平台要求重装系统清除买家数据。重装完成后确认，平台会重新完整探活；如主机指纹变化，需要重新确认指纹。</p>
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
