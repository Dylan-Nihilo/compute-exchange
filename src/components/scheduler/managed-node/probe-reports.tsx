"use client";

import {useQuery} from "@tanstack/react-query";

import {SectionQueryState} from "@/components/managed/query-states";
import {probeCheckIds} from "@/lib/domain/contracts";
import {formatDateTime} from "@/lib/format/date";
import {fetchProbeReports, probeCheckLabels, type ProbeReport} from "@/lib/managed-nodes";

const kindLabels: Record<string, string> = {full: "完整探活", light: "轻量探活", ports: "端口复测"};

function checkLabel(id: string) {
  return (probeCheckLabels as Record<string, {label: string; required: boolean}>)[id];
}

// docs/25 §25.4.3: P1–P13; P10 is advisory (failing it only disables card splitting).
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
          {older.length ? (
            <details>
              <summary className="cursor-pointer text-xs text-muted">历史报告（{older.length}）</summary>
              <ul className="mt-2 space-y-1 text-xs">
                {older.map((report) => (
                  <li className="flex flex-wrap gap-3" key={report.id}>
                    <span className="text-muted">{formatDateTime(report.created_at)}</span>
                    <span>{kindLabels[report.kind] ?? report.kind}</span>
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
  return report.checks.filter((check) => check.ok === false).map((check) => check.id);
}

function ReportTable({report}: {report: ProbeReport}) {
  const byId = new Map(report.checks.map((check) => [check.id, check]));
  // Known checks in P1–P13 order first, then anything newer the backend adds.
  const ids = [...probeCheckIds, ...report.checks.map((check) => check.id).filter((id) => !checkLabel(id))];
  return (
    <div>
      <p className="text-sm">
        <span className="font-medium">{kindLabels[report.kind] ?? report.kind}</span>
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
            {ids.map((id) => {
              const check = byId.get(id);
              const meta = checkLabel(id);
              const result = !check ? "未执行" : check.ok === null ? "未知" : check.ok ? "通过" : meta?.required === false ? "不满足（建议项）" : "未通过";
              const tone = !check || check.ok === null ? "text-muted" : check.ok ? "text-success" : meta?.required === false ? "text-warning" : "text-danger";
              return (
                <tr key={id}>
                  <th className="font-normal" scope="row">
                    <span className="font-mono text-xs text-muted">{id}</span> {meta?.label ?? ""}
                    {meta && !meta.required ? <span className="ml-1 text-xs text-muted">（建议）</span> : null}
                  </th>
                  <td className={`whitespace-nowrap ${tone}`}>{result}</td>
                  <td className="text-xs break-all text-muted">{check?.detail || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
