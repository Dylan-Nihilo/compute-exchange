"use client";

import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {SectionQueryState} from "@/components/managed/query-states";
import {isNotOpenError} from "@/lib/api/envelope";
import {ManagedSection} from "@/components/workspace/buyer/managed/managed-section";
import type {ManagedAccess} from "@/lib/managed-orders";
import {fetchDeployment, fetchDeployments, isLiveDeployment, type Deployment} from "@/lib/model-deploy";

import {DeployForm} from "./deploy-form";
import {deployKeys} from "./deploy-keys";
import {DeploymentAccess} from "./deployment-access";
import {DeploymentHealth} from "./deployment-health";
import {DeploymentHistory} from "./deployment-history";
import {DeploymentLogs} from "./deployment-logs";
import {DeploymentStatus} from "./deployment-status";

const TRANSITIONAL = new Set(["pending", "checking", "pulling", "starting", "restarting", "stopping"]);

function newestFirst(list: readonly Deployment[]) {
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Deploy form, current deployment (status/health/logs/access) and history for one active managed lease. */
export function DeploymentsWorkspace({orderNo, access}: {orderNo: string; access: ManagedAccess | undefined}) {
  const list = useQuery({
    queryKey: deployKeys.list(orderNo),
    queryFn: () => fetchDeployments(orderNo),
    refetchInterval: (query) => (query.state.data?.some((item) => TRANSITIONAL.has(item.state)) ? 5000 : 30_000),
    retry: false,
  });
  const [picked, setPicked] = useState<string | null>(null);
  const deployments = newestFirst(list.data ?? []);
  const live = deployments.find((item) => isLiveDeployment(item.state)) ?? null;
  const selected = picked ?? live?.deploy_no ?? deployments[0]?.deploy_no ?? null;
  // If the deployments routes are switched off (50000/404), deploy-plans may still answer, so feasibility stays viewable.
  const deploymentsNotOpen = list.isError && isNotOpenError(list.error);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-5">
        <SectionQueryState
          error={list.error}
          isError={list.isError}
          isPending={list.isPending}
          isRefetching={list.isFetching}
          loadingText="正在读取部署记录"
          notOpenText="模型部署的提交、运行状态与健康检测尚未开放。可在右侧先查看本租约能否部署所选模型。"
          onRetry={() => void list.refetch()}
        >
          {selected ? (
            <SelectedDeployment access={access} deployNo={selected} orderNo={orderNo} />
          ) : (
            <ManagedSection title="当前部署">
              <p className="text-sm text-muted">本租约尚未部署模型，可选择模型一键部署。部署运行后在此查看状态、健康曲线与访问方式。</p>
            </ManagedSection>
          )}
        </SectionQueryState>
      </div>
      <div className="space-y-5">
        {(list.isSuccess && !live) || deploymentsNotOpen ? (
          <ManagedSection
            title={deploymentsNotOpen ? "部署可行性" : "一键部署"}
            description="每个租约同一时间只运行一个部署，平台按租约卡数实时判定可行性。"
          >
            <DeployForm orderNo={orderNo} submitAvailable={list.isSuccess} onCreated={setPicked} />
          </ManagedSection>
        ) : null}
        {deployments.length > 0 ? (
          <ManagedSection title="部署记录">
            <DeploymentHistory deployments={deployments} selected={selected} onSelect={setPicked} />
          </ManagedSection>
        ) : null}
      </div>
    </div>
  );
}

function SelectedDeployment({orderNo, deployNo, access}: {orderNo: string; deployNo: string; access: ManagedAccess | undefined}) {
  const detail = useQuery({
    queryKey: deployKeys.detail(orderNo, deployNo),
    queryFn: () => fetchDeployment(orderNo, deployNo),
    refetchInterval: (query) => (TRANSITIONAL.has(query.state.data?.state ?? "") ? 5000 : 30_000),
    retry: false,
  });
  const deployment = detail.data;
  const running = deployment?.state === "running" || deployment?.state === "restarting";

  return (
    <>
      <ManagedSection title="当前部署">
        <SectionQueryState
          error={detail.error}
          isError={detail.isError}
          isPending={detail.isPending}
          isRefetching={detail.isFetching}
          loadingText="正在读取部署详情"
          notOpenText="部署详情接口暂未开放。"
          onRetry={() => void detail.refetch()}
        >
          {deployment ? <DeploymentStatus deployment={deployment} orderNo={orderNo} /> : null}
        </SectionQueryState>
      </ManagedSection>
      {running ? (
        <ManagedSection title="访问方式">
          <DeploymentAccess access={access} engine={deployment?.access ?? null} />
        </ManagedSection>
      ) : null}
      {deployment ? (
        <ManagedSection title="健康监测" description="健康状态只在运行中有意义；显存占用由引擎预分配，不作为健康依据。">
          <DeploymentHealth deployNo={deployNo} live={running} orderNo={orderNo} />
        </ManagedSection>
      ) : null}
      {deployment ? (
        <ManagedSection title="引擎日志">
          <DeploymentLogs deployNo={deployNo} orderNo={orderNo} />
        </ManagedSection>
      ) : null}
    </>
  );
}
