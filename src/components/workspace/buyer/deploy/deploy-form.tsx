"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {SectionQueryState} from "@/components/managed/query-states";
import {isBackendRequestError} from "@/lib/api/envelope";
import {
  createDeployment,
  deployConflict,
  deployErrorChecks,
  deployErrorPlans,
  fetchCatalogModels,
  GPU_MEM_UTIL_DEFAULT,
  type CatalogModel,
} from "@/lib/model-deploy";
import {notify} from "@/lib/notify";

import {ChecksList} from "./checks-list";
import {deployKeys} from "./deploy-keys";
import {DeployPlanStep} from "./deploy-plan-step";

/** Model picker → live feasibility → parameters/acks → POST deployments (docs/27 §27.4, §27.8). */
export function DeployForm({orderNo, submitAvailable, onCreated}: {orderNo: string; submitAvailable: boolean; onCreated: (deployNo: string) => void}) {
  const models = useQuery({queryKey: deployKeys.models, queryFn: () => fetchCatalogModels(), retry: false});
  const [modelId, setModelId] = useState<number | null>(null);
  const model = models.data?.find((item) => item.id === modelId) ?? null;

  return (
    <div className="space-y-4">
      <SectionQueryState
        emptyText="平台暂未上架可一键部署的模型。"
        error={models.error}
        isEmpty={(models.data ?? []).length === 0}
        isError={models.isError}
        isPending={models.isPending}
        isRefetching={models.isFetching}
        loadingText="正在读取模型目录"
        notOpenText="模型目录接口暂未开放。"
        onRetry={() => void models.refetch()}
      >
        <label className="block text-sm">
          <span className="text-muted">选择模型</span>
          <select
            className="mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            value={modelId ?? ""}
            onChange={(event) => setModelId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">请选择</option>
            {(models.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>{modelLabel(item)}</option>
            ))}
          </select>
        </label>
        {model ? <ModelFacts model={model} /> : null}
      </SectionQueryState>
      {model ? <DeploySubmit key={model.id} model={model} orderNo={orderNo} submitAvailable={submitAvailable} onCreated={onCreated} /> : null}
    </div>
  );
}

function modelLabel(model: CatalogModel) {
  return model.quant ? `${model.display_name} · ${model.quant}` : model.display_name;
}

function ModelFacts({model}: {model: CatalogModel}) {
  const facts = [
    model.license ? `许可证 ${model.license}` : null,
    model.weights_bytes ? `权重 ${(model.weights_bytes / 1024 ** 3).toFixed(1)} GiB` : null,
    model.max_model_len ? `最大上下文 ${model.max_model_len.toLocaleString("zh-CN")}` : null,
    model.min_compute_capability ? `算力架构 ≥ ${model.min_compute_capability}` : null,
    model.verified_gpu_models.length ? `已验证卡型 ${model.verified_gpu_models.join("、")}` : "尚无真机验证卡型",
  ].filter(Boolean);
  return facts.length ? <p className="mt-2 text-xs text-muted">{facts.join(" · ")}</p> : null;
}

function DeploySubmit({model, orderNo, submitAvailable, onCreated}: {model: CatalogModel; orderNo: string; submitAvailable: boolean; onCreated: (deployNo: string) => void}) {
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (input: Parameters<typeof createDeployment>[1]) => createDeployment(orderNo, input),
    onSuccess: async (created) => {
      notify.success("部署已提交，正在检查与拉取权重");
      await queryClient.invalidateQueries({queryKey: deployKeys.all(orderNo)});
      onCreated(created.deploy_no);
    },
  });
  const errorData = create.isError && isBackendRequestError(create.error) ? create.error.data : null;
  const rejected = deployErrorChecks(errorData);
  const validPlans = deployErrorPlans(errorData);
  const conflict = deployConflict(errorData);

  return (
    <div className="space-y-4">
      <DeployPlanStep
        defaults={{gpuMemUtil: GPU_MEM_UTIL_DEFAULT, canary: true}}
        isSubmitting={create.isPending}
        model={model}
        orderNo={orderNo}
        submitAvailable={submitAvailable}
        onSubmit={(input) => create.mutate(input)}
      />
      {create.isError ? (
        <div className="space-y-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3" role="alert">
          <p className="text-sm text-danger">{create.error.message}</p>
          <ChecksList checks={rejected} />
          {validPlans.length ? (
            <p className="text-xs text-muted">当前可行方案：{validPlans.map((plan) => `TP${plan.tp} × DP${plan.dp}`).join("、")}</p>
          ) : null}
          {conflict ? (
            <Button size="sm" variant="outline" onPress={() => { create.reset(); void queryClient.invalidateQueries({queryKey: deployKeys.all(orderNo)}); onCreated(conflict.deploy_no); }}>
              查看部署 {conflict.deploy_no}
            </Button>
          ) : null}
        </div>
      ) : null}
      {create.isError ? (
        <Button size="sm" variant="ghost" onPress={() => create.reset()}>清除错误</Button>
      ) : null}
    </div>
  );
}
