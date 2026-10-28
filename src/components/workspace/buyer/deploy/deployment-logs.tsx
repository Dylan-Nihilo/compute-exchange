"use client";

import {Button} from "@heroui/react";
import {useMutation} from "@tanstack/react-query";

import {fetchDeploymentLogs} from "@/lib/model-deploy";

/**
 * Engine log tail read on demand through the management channel. The backend limits this to
 * 6 reads per minute (42900) and audits each read; its message is shown as returned.
 */
export function DeploymentLogs({orderNo, deployNo}: {orderNo: string; deployNo: string}) {
  const logs = useMutation({mutationFn: () => fetchDeploymentLogs(orderNo, deployNo)});
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button isPending={logs.isPending} size="sm" variant="outline" onPress={() => logs.mutate()}>
          {logs.data !== undefined ? "刷新日志" : "读取最近 200 行"}
        </Button>
        <span className="text-xs text-muted">每分钟最多读取 6 次，每次读取均记入审计。</span>
      </div>
      {logs.isError ? <p className="text-sm text-danger" role="alert">{logs.error.message}</p> : null}
      {logs.data !== undefined ? (
        <pre className="max-h-96 overflow-auto rounded-xl bg-[#0f1d26] p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-white/85">
          {logs.data || "（日志为空）"}
        </pre>
      ) : null}
    </div>
  );
}
