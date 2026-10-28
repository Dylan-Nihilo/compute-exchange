"use client";

import {Input} from "@heroui/react";

export type ManagedNodeFieldState = {diskPerCardGb: string; portStart: string; portEnd: string};

/** Extra registration fields for SSH-managed nodes (docs/25 §25.10 POST /supplier/nodes). */
export function managedNodeInput(value: ManagedNodeFieldState) {
  const disk = Number(value.diskPerCardGb);
  const start = Number(value.portStart);
  const end = Number(value.portEnd);
  if (!Number.isInteger(disk) || disk < 1) return null;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1024 || end > 65535 || start > end) return null;
  return {mgmt_mode: "ssh" as const, disk_per_card_gb: disk, lease_port_start: start, lease_port_end: end};
}

const fieldClass = "mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";

export function ManagedNodeFields({disabled, onChange, value}: {disabled: boolean; onChange: (next: ManagedNodeFieldState) => void; value: ManagedNodeFieldState}) {
  const set = (key: keyof ManagedNodeFieldState) => (event: {target: {value: string}}) =>
    onChange({...value, [key]: event.target.value.replace(/\D/g, "")});
  const portsInvalid = Boolean(value.portStart && value.portEnd) && Number(value.portStart) > Number(value.portEnd);
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        每卡可分配数据盘（GB）
        <Input className={fieldClass} disabled={disabled} inputMode="numeric" onChange={set("diskPerCardGb")} placeholder="例如 200" required value={value.diskPerCardGb} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          租约端口起
          <Input className={fieldClass} disabled={disabled} inputMode="numeric" onChange={set("portStart")} required value={value.portStart} />
        </label>
        <label className="block text-sm font-medium">
          租约端口止
          <Input className={fieldClass} disabled={disabled} inputMode="numeric" onChange={set("portEnd")} required value={value.portEnd} />
        </label>
      </div>
      <p className={`text-xs ${portsInvalid ? "text-danger" : "text-muted"}`}>
        {portsInvalid ? "端口段起始不能大于结束。" : "租约端口段只对平台网关出口 IP 开放；探活会核实磁盘与端口。"}
      </p>
    </div>
  );
}
