"use client";

import {useState} from "react";

import {OptionChips} from "@/components/managed/option-chips";
import type {NodeOnboarding} from "@/lib/managed-nodes";

import {CopyBlock} from "./copy-block";

const distroLabels: Record<string, string> = {debian: "Debian / Ubuntu", rhel: "RHEL / CentOS / Rocky"};

// GET /supplier/nodes/:id/onboarding: the per-node management key line (with from=), egress IPs,
// the lease port range, per-distro firewall scripts and the machine requirements. In direct mode buyers
// connect to the lease ports themselves, so there are no gateway egress IPs or source-restriction scripts.
export function OnboardingInfo({onboarding}: {onboarding: NodeOnboarding}) {
  const scripts = Object.entries(onboarding.firewall_scripts);
  const [distro, setDistro] = useState<string | null>(null);
  const activeScript = scripts.find(([name]) => name === distro) ?? scripts[0];
  const direct = onboarding.access_mode === "direct";

  return (
    <div className="space-y-4">
      <CopyBlock label="管理公钥行（追加到管理账户的 ~/.ssh/authorized_keys，推荐方式，无需提交密码）" value={onboarding.authorized_keys_line} />
      <div className={direct ? "grid gap-3 sm:grid-cols-2" : "grid gap-3 sm:grid-cols-3"}>
        <IpList label="控制面出口 IP（需能访问管理 SSH 端口）" values={onboarding.controller_egress_ips} />
        {direct ? null : <IpList label="网关出口 IP（租约端口段只对其开放）" values={onboarding.gateway_egress_ips} />}
        <IpList
          label={direct ? "租约端口段（买家直连，需对公网开放入方向 TCP）" : "租约端口段"}
          values={[`${onboarding.lease_port_start}-${onboarding.lease_port_end}`]}
        />
      </div>
      {activeScript ? (
        <div className="space-y-2">
          <OptionChips
            items={scripts.map(([name]) => ({label: distroLabels[name] ?? name, value: name}))}
            label="租约端口放行脚本"
            onChange={setDistro}
            value={activeScript[0]}
          />
          <CopyBlock label={`${distroLabels[activeScript[0]] ?? activeScript[0]} 脚本（幂等，可重复执行）`} value={activeScript[1]} />
        </div>
      ) : direct ? (
        <p className="text-xs text-muted">买家直连租约端口，无需来源限制脚本：请在云安全组与主机防火墙中对公网放行上述端口段的入方向 TCP。</p>
      ) : (
        <p className="text-xs text-muted">平台未返回端口放行脚本，请按上方网关出口 IP 自行配置防火墙。</p>
      )}
      {onboarding.requirements.length ? (
        <div>
          <p className="text-xs font-medium text-muted">机器要求</p>
          <ul className="mt-1 list-inside list-disc space-y-1 text-xs leading-5 text-muted">
            {onboarding.requirements.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function IpList({label, values}: {label: string; values: string[]}) {
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-mono text-xs break-all">{values.length ? values.join(", ") : "未返回"}</p>
    </div>
  );
}
