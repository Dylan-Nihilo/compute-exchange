"use client";

import {Button} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {SectionQueryState} from "@/components/managed/query-states";
import {
  deploymentInput,
  fetchDeployPlans,
  recommendedPlan,
  requiredAcks,
  type CatalogModel,
  type DeploymentInput,
} from "@/lib/model-deploy";

import {ChecksList} from "./checks-list";
import {DeployAcks, type AckState} from "./deploy-acks";
import {deployKeys} from "./deploy-keys";
import {DeployParamsFields, maxLenError, planKey, type DeployParams} from "./deploy-params";

/** Live feasibility for the chosen model (re-evaluated by the backend on submit as well). */
export function DeployPlanStep({model, orderNo, defaults, isSubmitting, onSubmit}: {
  model: CatalogModel;
  orderNo: string;
  defaults: {gpuMemUtil: number; canary: boolean};
  isSubmitting: boolean;
  onSubmit: (input: DeploymentInput) => void;
}) {
  const query = useQuery({
    queryKey: deployKeys.plans(orderNo, model.id),
    queryFn: () => fetchDeployPlans(orderNo, model.id),
    retry: false,
  });

  return (
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
              {query.data.feasible ? "本租约可以部署该模型" : "本租约无法部署该模型"}
            </p>
            <ChecksList checks={query.data.checks} />
          </div>
          {query.data.feasible && query.data.plans.length > 0 ? (
            <PlanForm
              data={query.data}
              defaults={defaults}
              isSubmitting={isSubmitting}
              model={model}
              onSubmit={onSubmit}
            />
          ) : null}
        </div>
      ) : null}
    </SectionQueryState>
  );
}

function PlanForm({data, model, defaults, isSubmitting, onSubmit}: {
  data: NonNullable<Awaited<ReturnType<typeof fetchDeployPlans>>>;
  model: CatalogModel;
  defaults: {gpuMemUtil: number; canary: boolean};
  isSubmitting: boolean;
  onSubmit: (input: DeploymentInput) => void;
}) {
  const initial = recommendedPlan(data.plans);
  const [params, setParams] = useState<DeployParams>({
    planKey: initial ? planKey(initial) : null,
    maxModelLen: initial ? String(initial.max_model_len) : "",
    gpuMemUtil: defaults.gpuMemUtil,
    canary: defaults.canary,
  });
  const [acks, setAcks] = useState<AckState>({license: false, untested: false});
  const required = requiredAcks(data.checks, model);
  const plan = data.plans.find((item) => planKey(item) === params.planKey) ?? null;
  const lenError = maxLenError(plan, params.maxModelLen);
  const missingAck = (required.license && !acks.license) || (required.untested && !acks.untested);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!plan || lenError || missingAck) return;
        const parsed = deploymentInput.safeParse({
          model_id: model.id,
          tp: plan.tp,
          dp: plan.dp,
          max_model_len: Number(params.maxModelLen),
          gpu_mem_util: Math.round(params.gpuMemUtil * 100) / 100,
          canary_enabled: params.canary,
          license_ack: required.license ? acks.license : false,
          untested_ack: required.untested ? acks.untested : false,
        });
        if (parsed.success) onSubmit(parsed.data);
      }}
    >
      <DeployParamsFields disabled={isSubmitting} plans={data.plans} value={params} onChange={setParams} />
      {lenError && plan ? <p className="text-sm text-danger" role="alert">{lenError}</p> : null}
      <DeployAcks disabled={isSubmitting} model={model} required={required} value={acks} onChange={setAcks} />
      <Button isDisabled={!plan || Boolean(lenError) || missingAck} isPending={isSubmitting} type="submit">
        一键部署
      </Button>
    </form>
  );
}
