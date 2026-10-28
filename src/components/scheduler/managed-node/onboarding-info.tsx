"use client";

import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {OptionChips} from "@/components/managed/option-chips";
import {SectionQueryState} from "@/components/managed/query-states";
import {fetchNodeOnboarding} from "@/lib/managed-nodes";

import {CopyBlock} from "./copy-block";

// docs/25 §25.4.2 step ③: the per-node management key line (with from=) and firewall scripts.
export function OnboardingInfo({nodeId}: {nodeId: number}) {
  const query = useQuery({
    queryKey: ["managed-node", nodeId, "onboarding"],
    queryFn: () => fetchNodeOnboarding(nodeId),
    retry: false,
    staleTime: 60_000,
  });
  const scripts = Object.entries(query.data?.firewall_scripts ?? {});
  const [distro, setDistro] = useState<string | null>(null);
  const activeScript = scripts.find(([name]) => name === distro) ?? scripts[0];

  return (
    <SectionQueryState
      error={query.error}
      isError={query.isError}
      isPending={query.isPending}
      isRefetching={query.isFetching}
      loadingText="正在读取接入信息"
      onRetry={() => void query.refetch()}
    >
      {query.data ? (
        <div className="space-y-4">
          <CopyBlock label="管理公钥（追加到管理账户的 ~/.ssh/authorized_keys）" value={query.data.authorized_key} />
          <div className="grid gap-3 sm:grid-cols-2">
            <IpList label="控制面出口 IP（需放行管理 SSH 端口）" ips={query.data.control_plane_ips} />
            <IpList label="网关出口 IP（租约端口段只对其开放）" ips={query.data.gateway_egress_ips} />
          </div>
          {activeScript ? (
            <div className="space-y-2">
              <OptionChips
                items={scripts.map(([name]) => ({label: name, value: name}))}
                label="端口放行脚本"
                onChange={setDistro}
                value={activeScript[0]}
              />
              <CopyBlock label={`${activeScript[0]} 脚本`} value={activeScript[1]} />
            </div>
          ) : (
            <p className="text-xs text-muted">平台未返回端口放行脚本，请按上方网关出口 IP 自行配置防火墙。</p>
          )}
          <p className="text-xs leading-5 text-muted">
            管理账户需能执行 docker（docker 组或 root），不要求 sudo；请注意 docker 组权限等同 root。
          </p>
        </div>
      ) : null}
    </SectionQueryState>
  );
}

function IpList({ips, label}: {ips?: string[] | null; label: string}) {
  return (
    <div className="rounded-xl border border-border px-3 py-2.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-mono text-xs break-all">{ips?.length ? ips.join(", ") : "未返回"}</p>
    </div>
  );
}
