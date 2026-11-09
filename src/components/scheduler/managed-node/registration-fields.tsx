"use client";

import {Input} from "@heroui/react";

import {managedNodeInput, managedNodeInputError, type ManagedNodeFieldState} from "@/lib/managed-node-registration";
import {hostKeyCheckCommand} from "@/lib/managed-nodes";

export {managedNodeInput, managedNodeInputError, type ManagedNodeFieldState};

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";

/** Extra registration fields for SSH-managed nodes (POST /supplier/nodes with mgmt_mode=ssh). */
export function ManagedNodeFields({containerDelivery, disabled, error, onChange, value}: {
  containerDelivery: boolean;
  disabled: boolean;
  error: string | null;
  onChange: (next: ManagedNodeFieldState) => void;
  value: ManagedNodeFieldState;
}) {
  const digits = (key: "diskPerCardGb" | "portStart" | "portEnd") => (event: {target: {value: string}}) =>
    onChange({...value, [key]: event.target.value.replace(/\D/g, "")});
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        每卡可分配数据盘（GB）{containerDelivery ? null : <span className="ml-1 text-xs font-normal text-muted">（整机交付可不填）</span>}
        <Input className={fieldClass} disabled={disabled} inputMode="numeric" onChange={digits("diskPerCardGb")} placeholder="例如 200" required={containerDelivery} value={value.diskPerCardGb} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          租约端口起
          <Input className={fieldClass} disabled={disabled} inputMode="numeric" onChange={digits("portStart")} required value={value.portStart} />
        </label>
        <label className="block text-sm font-medium">
          租约端口止
          <Input className={fieldClass} disabled={disabled} inputMode="numeric" onChange={digits("portEnd")} required value={value.portEnd} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        预期主机指纹（推荐）
        <Input autoComplete="off" className={`${fieldClass} font-mono`} disabled={disabled} onChange={(event) => onChange({...value, expectedFingerprint: event.target.value})} placeholder="SHA256:…" value={value.expectedFingerprint} />
        <span className="mt-1 block text-xs font-normal leading-5 text-muted">
          在机器上执行 <code className="font-mono">{hostKeyCheckCommand}</code> 填写第二列。预先填写后平台首次连接即校验主机身份，无需事后确认指纹。
        </span>
      </label>
      <p className={`text-xs ${error ? "text-danger" : "text-muted"}`}>
        {error ?? "租约端口段只对平台网关出口 IP 开放，至少需要 卡数+1 个端口（含探活自检端口），最多 1000 个；探活会核实磁盘与端口。"}
      </p>
    </div>
  );
}
