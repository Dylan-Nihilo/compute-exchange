"use client";

import {Button} from "@heroui/react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {formatDateTime} from "@/lib/format/date";
import {changeDeploymentState, deployStateCopy, healthCopy, pullPercent, restartLabel, type Deployment} from "@/lib/model-deploy";
import {notify} from "@/lib/notify";

import {deployKeys} from "./deploy-keys";

const healthTone: Record<string, string> = {
  healthy: "bg-success/10 text-success",
  degraded: "bg-warning/10 text-warning",
  unhealthy: "bg-danger/10 text-danger",
  unknown: "border border-dashed border-border text-muted",
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
      notify.success(kind === "stop" ? "已提交停止" : resume ? "已提交恢复" : "已提交重启");
      await queryClient.invalidateQueries({queryKey: deployKeys.all(orderNo)});
    },
    onError: (error) => {
      setConfirm(null);
      notify.error(error.message);
    },
  });
  const {state} = deployment;
  const restart = restartLabel(state);
  const resume = restart === "恢复";

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
          {restart ? (
            <Button isDisabled={action.isPending} size="sm" variant="outline" onPress={() => setConfirm("restart")}>{restart}</Button>
          ) : null}
          {STOPPABLE.has(state) ? (
            <Button isDisabled={action.isPending} size="sm" variant="outline" onPress={() => setConfirm("stop")}>停止</Button>
          ) : null}
        </div>
      </div>
      <HealthReason deployment={deployment} />
      <PullProgress deployment={deployment} />
      <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
        <Fact label="模型" value={deployment.model.display_name || deployment.model.model_key} />
        <Fact label="并行" value={`TP${deployment.tp} × DP${deployment.dp}`} />
        <Fact label="最大上下文" value={deployment.max_model_len.toLocaleString("zh-CN")} />
        <Fact label="显存利用率" value={deployment.gpu_mem_util != null ? deployment.gpu_mem_util.toFixed(2) : "—"} />
        <Fact label="探针请求" value={deployment.canary_enabled ? "开启" : "关闭"} />
        <Fact label="占用 GPU" value={deployment.gpu_uuids.length ? `${deployment.gpu_uuids.length} 张` : "—"} />
        <Fact label="自动重启次数" value={String(deployment.restart_count)} />
        <Fact label="最近重启" value={deployment.last_restart_at ? formatDateTime(deployment.last_restart_at) : "—"} />
        {deployment.next_restart_at ? <Fact label="下次自动重启" value={formatDateTime(deployment.next_restart_at)} /> : null}
        <Fact label="启动时间" value={deployment.started_at ? formatDateTime(deployment.started_at) : "—"} />
        <Fact label="停止时间" value={deployment.stopped_at ? formatDateTime(deployment.stopped_at) : "—"} />
      </dl>
      <FailureDetail deployment={deployment} />
      <ConfirmDialog
        confirmLabel={confirm === "stop" ? "停止部署" : resume ? "恢复部署" : "重启引擎"}
        description={confirm === "stop"
          ? "停止后引擎容器退出，推理接口不再可用。"
          : resume
            ? "按原参数在本租约的同一组 GPU 上重新拉起引擎。若租约已重新分配节点或 GPU，需重新提交部署。"
            : "重启期间推理接口暂不可用，进行中的请求会中断。"}
        isDestructive={confirm === "stop"}
        isPending={action.isPending}
        open={confirm !== null}
        title={confirm === "stop" ? "停止模型部署" : resume ? "恢复模型部署" : "重启模型引擎"}
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
  if (!deployment.health_reason && !deployment.health_reason_text) return null;
  return (
    <p className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm" role="status">
      {deployment.health_reason_text ?? ""}
      {deployment.health_reason ? <span className="ml-2 font-mono text-xs text-muted">{deployment.health_reason}</span> : null}
    </p>
  );
}

function PullProgress({deployment}: {deployment: Deployment}) {
  const cache = deployment.cache;
  if (deployment.state !== "pulling" || !cache) return null;
  const gib = (bytes: number) => (bytes / 1024 ** 3).toFixed(1);
  const pct = pullPercent(cache);
  return (
    <div className="space-y-1 text-xs text-muted">
      <p>
        已拉取 {gib(cache.bytes_done)} GiB{cache.weights_bytes ? ` / ${gib(cache.weights_bytes)} GiB` : ""}
        {pct != null ? `（${pct.toFixed(0)}%）` : ""}
      </p>
      {pct != null ? (
        <div className="h-1.5 overflow-hidden rounded-full border border-border">
          <div className="h-full bg-[#173447]" style={{width: `${pct}%`}} />
        </div>
      ) : null}
    </div>
  );
}

/** Failure / stop reason plus the deployment event trail (detail view only). */
function FailureDetail({deployment}: {deployment: Deployment}) {
  const failed = deployment.state === "failed" && deployment.fail_reason;
  const stopped = deployment.state === "stopped" && deployment.stop_reason;
  return (
    <>
      {failed ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          失败原因：{deployment.fail_reason}。失败时留存的末尾日志可在下方「引擎日志」读取。
        </p>
      ) : null}
      {stopped ? <p className="text-sm text-muted">停止原因：{deployment.stop_reason}</p> : null}
      {deployment.events.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted">部署事件（{deployment.events.length}）</summary>
          <ol className="mt-2 space-y-1 text-xs">
            {deployment.events.map((event, index) => (
              <li key={`${event.created_at}-${index}`}>
                <span className="text-muted">{formatDateTime(event.created_at)}</span> · {event.kind}
                {event.reason ? <span className="ml-1 font-mono text-muted">{event.reason}</span> : null}
                {event.detail ? <span className="block break-words text-muted">{event.detail}</span> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </>
  );
}
