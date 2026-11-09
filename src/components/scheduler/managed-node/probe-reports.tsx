"use client";

import {useQuery} from "@tanstack/react-query";

import {SectionQueryState} from "@/components/managed/query-states";
import {formatDateTime} from "@/lib/format/date";
import {fetchProbeReports, probeKindLabels, type ProbeCheck, type ProbeInventory, type ProbeReport} from "@/lib/managed-nodes";

// GET /supplier/nodes/:id/probe-reports: check names and the required flag come from the backend
// (P10 is the only advisory check today); `skipped` means a prerequisite failed so it did not run.
export function ProbeReports({nodeId, polling}: {nodeId: number; polling: boolean}) {
  const query = useQuery({
    queryKey: ["managed-node", nodeId, "probe-reports"],
    queryFn: () => fetchProbeReports(nodeId, 10),
    retry: false,
    refetchInterval: polling ? 5000 : false,
  });
  const [latest, ...older] = query.data ?? [];

  return (
    <SectionQueryState
      emptyText="还没有探活报告。保存 SSH 信息后开始探活。"
      error={query.error}
      isEmpty={!latest}
      isError={query.isError}
      isPending={query.isPending}
      isRefetching={query.isFetching}
      loadingText="正在读取探活报告"
      onRetry={() => void query.refetch()}
    >
      {latest ? (
        <div className="space-y-4">
          <ReportTable report={latest} />
          {latest.inventory ? <InventorySummary inventory={latest.inventory} /> : null}
          {older.length ? (
            <details>
              <summary className="cursor-pointer text-xs text-muted">历史报告（{older.length}）</summary>
              <ul className="mt-2 space-y-1 text-xs">
                {older.map((report) => (
                  <li className="flex flex-wrap gap-3" key={report.id}>
                    <span className="text-muted">{formatDateTime(report.created_at)}</span>
                    <span>{probeKindLabels[report.kind] ?? report.kind}</span>
                    <span className={report.result === "pass" ? "text-success" : "text-danger"}>{report.result === "pass" ? "通过" : "未通过"}</span>
                    {report.result === "fail" ? <span className="text-muted">未通过：{failedIds(report).join("、") || "—"}</span> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </SectionQueryState>
  );
}

function failedIds(report: ProbeReport) {
  return report.checks.filter((check) => !check.ok && !check.skipped && check.required).map((check) => check.id);
}

export function checkOutcome(check: ProbeCheck): {label: string; tone: string} {
  if (check.skipped) return {label: "未执行（前置项未通过）", tone: "text-muted"};
  if (check.ok) return {label: "通过", tone: "text-success"};
  return check.required ? {label: "未通过", tone: "text-danger"} : {label: "不满足（非必检）", tone: "text-warning"};
}

function ReportTable({report}: {report: ProbeReport}) {
  return (
    <div>
      <p className="text-sm">
        <span className="font-medium">{probeKindLabels[report.kind] ?? report.kind}</span>
        <span className="ml-2 text-muted">{formatDateTime(report.created_at)}</span>
        <span className={`ml-2 font-medium ${report.result === "pass" ? "text-success" : "text-danger"}`}>
          {report.result === "pass" ? "全部必检项通过" : "存在未通过项"}
        </span>
      </p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2">
          <thead className="bg-surface-secondary text-xs text-muted">
            <tr><th scope="col">检查项</th><th scope="col">结果</th><th scope="col">说明</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report.checks.map((check) => {
              const outcome = checkOutcome(check);
              return (
                <tr key={check.id}>
                  <th className="font-normal" scope="row">
                    <span className="font-mono text-xs text-muted">{check.id}</span> {check.name}
                    {!check.required ? <span className="ml-1 text-xs text-muted">（非必检）</span> : null}
                  </th>
                  <td className={`whitespace-nowrap ${outcome.tone}`}>{outcome.label}</td>
                  <td className="text-xs break-all text-muted">{check.detail || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventorySummary({inventory}: {inventory: ProbeInventory}) {
  const faulty = Object.entries(inventory.faulty ?? {});
  const rows: [string, string][] = [
    ["系统", `${inventory.os} · 内核 ${inventory.kernel}`],
    ["驱动 / CUDA", `${inventory.driver_version} / ${inventory.cuda_version}`],
    ["Docker", inventory.docker_version],
    ["CPU / 内存", `${inventory.cpu_cores} 核 / ${inventory.mem_gb} GB`],
    ["数据盘", `${inventory.disk_path} 剩余 ${inventory.disk_free_gb} GB · ${inventory.disk_quota_supported ? "支持按卡配额" : "不支持配额（仅可整机出租）"}`],
  ];
  return (
    <details>
      <summary className="cursor-pointer text-xs text-muted">实测清单（{inventory.gpus.length} 张 GPU）</summary>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[120px_minmax(0,1fr)]">
        {rows.map(([label, value]) => (
          <div className="contents" key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="break-all">{value}</dd>
          </div>
        ))}
      </dl>
      {inventory.gpus.length ? (
        <ul className="mt-2 space-y-0.5 text-xs">
          {inventory.gpus.map((gpu) => (
            <li className="font-mono break-all text-muted" key={gpu.uuid || gpu.index}>
              GPU {gpu.index} · {gpu.name} · {Math.round(gpu.memory_mib / 1024)} GB · {gpu.pci_bus_id}
              {inventory.topo_groups[String(gpu.index)] ? ` · ${inventory.topo_groups[String(gpu.index)]}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {faulty.length ? (
        <ul className="mt-2 space-y-0.5 text-xs text-danger">
          {faulty.map(([index, reason]) => <li key={index}>GPU {index} 故障：{reason}</li>)}
        </ul>
      ) : null}
    </details>
  );
}
