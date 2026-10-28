"use client";

import {Button} from "@heroui/react";
import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {SectionQueryState, useDebouncedValue} from "@/components/managed/query-states";
import {
  deploymentInput,
  fetchDeployPlans,
  formatGpuMemUtil,
  recommendedPlan,
  requiredAcks,
  undeterminedInputs,
  type CatalogModel,
  type DeploymentInput,
  type DeployPlans,
} from "@/lib/model-deploy";

import {ChecksList} from "./checks-list";
import {DeployAcks, type AckState} from "./deploy-acks";
import {deployKeys} from "./deploy-keys";
import {DeployParamsFields, GpuMemUtilField, maxLenError, planKey, type DeployParams} from "./deploy-params";

/**
 * Live feasibility for the chosen model at the chosen gpu_mem_util (the backend re-evaluates on
 * submit as well). `submitAvailable=false` while POST deployments (T-098) is not live: checks are
 * still shown so the buyer can see whether and why the lease can host the model.
 */
export function DeployPlanStep({model, orderNo, defaults, isSubmitting, submitAvailable, onSubmit}: {
  model: CatalogModel;
  orderNo: string;
  defaults: {gpuMemUtil: number; canary: boolean};
  isSubmitting: boolean;
  submitAvailable: boolean;
  onSubmit: (input: DeploymentInput) => void;
}) {
  const [gpuMemUtil, setGpuMemUtil] = useState(defaults.gpuMemUtil);
  const util = useDebouncedValue(formatGpuMemUtil(gpuMemUtil), 400);
  const settled = util === formatGpuMemUtil(gpuMemUtil);
  const query = useQuery({
    queryKey: [...deployKeys.plans(orderNo, model.id), util],
    queryFn: () => fetchDeployPlans(orderNo, model.id, Number(util)),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const evaluating = !settled || query.isFetching;

  return (
    <div className="space-y-4">
      <GpuMemUtilField disabled={isSubmitting} value={gpuMemUtil} onChange={setGpuMemUtil} />
      <SectionQueryState
        error={query.error}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在判定能否部署"
        notOpenText="可行性判定接口暂未开放。"
        onRetry={() => void query.refetch()}
      >
        {query.data ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className={`text-sm font-medium ${query.data.feasible ? "text-success" : "text-danger"}`}>
                {evaluating ? "正在重新判定…" : query.data.feasible ? "本租约可以部署该模型" : "本租约暂不能部署该模型"}
              </p>
              <ChecksList checks={query.data.checks} />
              <Undetermined data={query.data} />
              <MemoryReasons data={query.data} />
            </div>
            {query.data.feasible && query.data.plans.length > 0 ? (
              <PlanForm
                key={util}
                data={query.data}
                defaults={defaults}
                gpuMemUtil={Number(util)}
                isEvaluating={evaluating}
                isSubmitting={isSubmitting}
                model={model}
                submitAvailable={submitAvailable}
                onSubmit={onSubmit}
              />
            ) : null}
          </div>
        ) : null}
      </SectionQueryState>
    </div>
  );
}

/** `basis.undetermined`: inputs the platform has not collected yet, with the backend's reason. */
function Undetermined({data}: {data: DeployPlans}) {
  const rows = undeterminedInputs(data);
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-3 text-xs">
      <p className="font-medium text-muted">以下数据平台尚未采集，相关检查项判为“无法判定”：</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
        {rows.map((row) => <li key={row.key}>{row.label}：{row.reason}</li>)}
      </ul>
    </div>
  );
}

/** Per-tp memory evaluation reasons, shown when no plan is feasible. */
function MemoryReasons({data}: {data: DeployPlans}) {
  if (data.feasible) return null;
  const rows = data.memory.filter((item) => !item.feasible && item.reason);
  if (rows.length === 0) return null;
  return (
    <ul className="space-y-1 text-xs text-muted">
      {rows.map((item) => <li key={item.tp}>TP{item.tp}：{item.reason}</li>)}
    </ul>
  );
}

function PlanForm({data, model, defaults, gpuMemUtil, isEvaluating, isSubmitting, submitAvailable, onSubmit}: {
  data: DeployPlans;
  model: CatalogModel;
  defaults: {canary: boolean};
  gpuMemUtil: number;
  isEvaluating: boolean;
  isSubmitting: boolean;
  submitAvailable: boolean;
  onSubmit: (input: DeploymentInput) => void;
}) {
  const initial = recommendedPlan(data.plans);
  const [params, setParams] = useState<DeployParams>({
    planKey: initial ? planKey(initial) : null,
    maxModelLen: initial ? String(initial.max_model_len) : "",
    canary: defaults.canary,
  });
  const [acks, setAcks] = useState<AckState>({license: false, untested: false});
  const required = requiredAcks(data.checks);
  const plan = data.plans.find((item) => planKey(item) === params.planKey) ?? null;
  const lenError = maxLenError(plan, params.maxModelLen);
  const missingAck = (required.license && !acks.license) || (required.untested && !acks.untested);
  const blocked = !submitAvailable || !plan || Boolean(lenError) || missingAck || isEvaluating;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (blocked || !plan) return;
        const parsed = deploymentInput.safeParse({
          model_id: model.id,
          tp: plan.tp,
          dp: plan.dp,
          max_model_len: Number(params.maxModelLen),
          gpu_mem_util: gpuMemUtil,
          canary_enabled: params.canary,
          license_ack: required.license ? acks.license : false,
          untested_ack: required.untested ? acks.untested : false,
        });
        if (parsed.success) onSubmit(parsed.data);
      }}
    >
      <DeployParamsFields disabled={isSubmitting} plans={data.plans} value={params} onChange={setParams} />
      {lenError && plan ? <p className="text-sm text-danger" role="alert">{lenError}</p> : null}
      <DeployAcks checks={data.checks} disabled={isSubmitting} model={model} required={required} value={acks} onChange={setAcks} />
      {!submitAvailable ? (
        <p className="text-sm text-muted" role="status">一键部署的提交与运行管理尚未开放，当前仅可查看可行性判定。</p>
      ) : null}
      <Button isDisabled={blocked} isPending={isSubmitting} type="submit">
        {submitAvailable ? "一键部署" : "暂不可提交"}
      </Button>
    </form>
  );
}
