"use client";

import {Button} from "@heroui/react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {formatDateTime} from "@/lib/format/date";
import {changeDeploymentState, deployStateCopy, healthCopy, type Deployment} from "@/lib/model-deploy";
import {notify} from "@/lib/notify";

import {deployKeys} from "./deploy-keys";

const healthTone: Record<string, string> = {
  healthy: "bg-success/10 text-success",
  degraded: "bg-warning/10 text-warning",
  unhealthy: "bg-danger/10 text-danger",
  unknown: "bg-default/40 text-muted",
};
const STOPPABLE = new Set(["pending", "checking", "pulling", "starting", "running", "restarting"]);
const healthMeaningful = (state: string) => state === "running" || state === "restarting";

/** Current lifecycle state, health and reason, plus buyer stop/restart (idempotent on the backend). */
export function DeploymentStatus({orderNo, deployment}: {orderNo: string; deployment: Deployment}) {
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"stop" | "restart" | null>(null);
  const action = useMutation({
    mutationFn: (kind: "stop" | "restart") => changeDeploymentState(orderNo, deployment.deploy_no, kind),
    onSuccess: async (_data, kind) => {
      setConfirm(null);
      notify.success(kind === "stop" ? "已提交停止" : "已提交重启");
      await queryClient.invalidateQueries({queryKey: deployKeys.all(orderNo)});
    },
    onError: (error) => {
      setConfirm(null);
      notify.error(error.message);
    },
  });
  const {state} = deployment;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#173447] px-3 py-1 text-xs font-medium text-white">{deployStateCopy[state] ?? state}</span>
        {healthMeaningful(state) ? (
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${healthTone[deployment.health] ?? healthTone.unknown}`}>
            {healthCopy[deployment.health] ?? deployment.health}
          </span>
        ) : null}
        <span className="text-xs text-muted">{deployment.deploy_no}</span>
        <div className="ml-auto flex gap-2">
          {state === "running" ? (
            <Button isDisabled={action.isPending} size="sm" variant="outline" onPress={() => setConfirm("restart")}>重启</Button>
          ) : null}
          {STOPPABLE.has(state) ? (
            <Button isDisabled={action.isPending} size="sm" variant="outline" onPress={() => setConfirm("stop")}>停止</Button>
          ) : null}
        </div>
      </div>
      <HealthReason deployment={deployment} />
      <PullProgress deployment={deployment} />
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        <Fact label="模型" value={deployment.display_name ?? deployment.model_key ?? "—"} />
        <Fact label="并行" value={`TP${deployment.tp} × DP${deployment.dp}`} />
        <Fact label="最大上下文" value={deployment.max_model_len.toLocaleString("zh-CN")} />
        <Fact label="显存利用率" value={deployment.gpu_mem_util != null ? deployment.gpu_mem_util.toFixed(2) : "—"} />
        <Fact label="探针请求" value={deployment.canary_enabled == null ? "—" : deployment.canary_enabled ? "开启" : "关闭"} />
        <Fact label="自动重启次数" value={deployment.restart_count != null ? String(deployment.restart_count) : "—"} />
        <Fact label="最近重启" value={deployment.last_restart_at ? formatDateTime(deployment.last_restart_at) : "—"} />
        <Fact label="启动时间" value={deployment.started_at ? formatDateTime(deployment.started_at) : "—"} />
        <Fact label="停止时间" value={deployment.stopped_at ? formatDateTime(deployment.stopped_at) : "—"} />
      </dl>
      <FailureDetail deployment={deployment} />
      <ConfirmDialog
        confirmLabel={confirm === "stop" ? "停止部署" : "重启引擎"}
        description={confirm === "stop"
          ? "停止后引擎容器退出，推理接口不再可用。"
          : "重启期间推理接口暂不可用，进行中的请求会中断。"}
        isDestructive={confirm === "stop"}
        isPending={action.isPending}
        open={confirm !== null}
        title={confirm === "stop" ? "停止模型部署" : "重启模型引擎"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) action.mutate(confirm);
        }}
      />
    </div>
  );
}

function Fact({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate">{value}</dd>
    </div>
  );
}

function HealthReason({deployment}: {deployment: Deployment}) {
  if (!healthMeaningful(deployment.state) || deployment.health === "healthy") return null;
  if (!deployment.health_reason && !deployment.health_message) return null;
  return (
    <p className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm" role="status">
      {deployment.health_message ?? ""}
      {deployment.health_reason ? <span className="ml-2 font-mono text-xs text-muted">{deployment.health_reason}</span> : null}
    </p>
  );
}

function PullProgress({deployment}: {deployment: Deployment}) {
  const progress = deployment.pull_progress;
  if (deployment.state !== "pulling" || !progress) return null;
  const gib = (bytes: number) => (bytes / 1024 ** 3).toFixed(1);
  const pct = progress.bytes_total ? Math.min(100, (progress.bytes_done / progress.bytes_total) * 100) : null;
  return (
    <div className="space-y-1 text-xs text-muted">
      <p>
        已拉取 {gib(progress.bytes_done)} GiB{progress.bytes_total ? ` / ${gib(progress.bytes_total)} GiB` : ""}
        {pct != null ? `（${pct.toFixed(0)}%）` : ""}
      </p>
      {pct != null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-default/40">
          <div className="h-full bg-[#173447]" style={{width: `${pct}%`}} />
        </div>
      ) : null}
    </div>
  );
}

function FailureDetail({deployment}: {deployment: Deployment}) {
  if (deployment.state !== "failed" || (!deployment.fail_reason && !deployment.log_tail)) return null;
  return (
    <div className="space-y-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3" role="alert">
      {deployment.fail_reason ? <p className="text-sm text-danger">失败原因：{deployment.fail_reason}</p> : null}
      {deployment.log_tail ? (
        <pre className="max-h-64 overflow-auto rounded-lg bg-[#0f1d26] p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-white/85">
          {deployment.log_tail}
        </pre>
      ) : null}
    </div>
  );
}
