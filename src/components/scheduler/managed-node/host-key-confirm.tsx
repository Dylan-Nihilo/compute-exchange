"use client";

import {Button, Input} from "@heroui/react";
import {useMutation} from "@tanstack/react-query";
import {useState} from "react";

import {errorMessage} from "@/lib/api/envelope";
import {confirmNodeHostKey, isSshFingerprint, type NodeOnboarding} from "@/lib/managed-nodes";
import {notify} from "@/lib/notify";

import {CopyBlock} from "./copy-block";

/**
 * docs/25 §25.4.2 step ⑦: the supplier compares the fingerprint the platform observed with the one
 * printed on the machine and submits what they read; the backend rejects a mismatch with 40001.
 */
export function HostKeyConfirm({onboarding, onConfirmed}: {onboarding: NodeOnboarding; onConfirmed: () => void}) {
  const [typed, setTyped] = useState("");
  const observed = onboarding.host_key.fingerprint ?? "";
  const confirm = useMutation({
    mutationFn: () => confirmNodeHostKey(onboarding.node_id, typed),
    onSuccess: (result) => {
      // task_id 0: SSH info incomplete, so the backend pinned the key without queueing a probe.
      notify.success(result.task_id ? "主机指纹已确认，平台已发起完整探活" : "主机指纹已确认；SSH 信息不完整，暂未发起探活");
      setTyped("");
      onConfirmed();
    },
  });
  const formatOk = isSshFingerprint(typed);
  const differs = Boolean(observed && formatOk && typed.trim() !== observed);

  return (
    <div className="space-y-4">
      {onboarding.verify_status === "key_mismatch" ? (
        <p className="rounded-xl border border-danger/40 bg-danger/5 px-3 py-2.5 text-sm text-danger" role="alert">
          平台检测到该节点的主机指纹与已确认的不一致，已停止新的分配。若你刚重装过系统，请核对后重新确认；否则请排查是否存在中间人或地址被占用。
        </p>
      ) : null}
      {observed ? (
        <CopyBlock label="平台首次连接观测到的主机指纹" value={observed} />
      ) : (
        <p className="text-sm text-muted">平台尚未记录主机指纹，请先完成一次探活。</p>
      )}
      <CopyBlock label="在节点上执行以下命令查看实际指纹" value={onboarding.host_key.check_command} />
      <label className="block text-xs font-medium text-muted">
        节点上看到的指纹
        <Input
          autoComplete="off"
          className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 font-mono text-sm"
          onChange={(event) => {setTyped(event.target.value); confirm.reset();}}
          placeholder="SHA256:…"
          value={typed}
        />
      </label>
      {typed && !formatOk ? <p className="text-xs text-danger">请粘贴命令输出中以 SHA256: 开头的那一段。</p> : null}
      {differs ? (
        <p className="text-sm text-danger" role="alert">与平台观测值不一致，请不要确认，先检查填写的主机地址是否正确。</p>
      ) : null}
      {confirm.isError ? <p className="text-sm text-danger" role="alert">{errorMessage(confirm.error, "指纹确认失败")}</p> : null}
      <Button isDisabled={!observed || !formatOk || differs} isPending={confirm.isPending} onPress={() => confirm.mutate()}>
        确认指纹一致
      </Button>
    </div>
  );
}
