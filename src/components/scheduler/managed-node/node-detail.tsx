"use client";

import {Button, Skeleton} from "@heroui/react";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {ArrowLeft} from "lucide";
import Link from "next/link";
import type {ReactNode} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {useAuthStore} from "@/lib/auth/store";
import {formatDateTime} from "@/lib/format/date";
import {onboardingStage, verifyStatusLabels, type OnboardingStage} from "@/lib/managed-nodes";
import {fetchSupplierNodes, isManagedNode, type ComputeNode} from "@/lib/scheduler";

import {HostKeyConfirm} from "./host-key-confirm";
import {OnboardingInfo} from "./onboarding-info";
import {ProbeReports} from "./probe-reports";
import {SlotGrid} from "./slot-grid";
import {SshForm} from "./ssh-form";
import {VerifyActions} from "./verify-actions";

const steps: {id: string; label: string; stages: OnboardingStage[]}[] = [
  {id: "ssh", label: "配置 SSH", stages: ["ssh"]},
  {id: "verify", label: "开始探活", stages: ["verify"]},
  {id: "fingerprint", label: "确认主机指纹", stages: ["confirm_host_key"]},
  {id: "probe", label: "完整探活", stages: ["verifying", "failed", "reimage"]},
  {id: "done", label: "可上架", stages: ["verified"]},
];

// docs/25 §25.4.2 onboarding wizard for one SSH-managed node. The node itself comes from the
// existing list endpoint (there is no single-node GET in §25.10).
export function ManagedNodeDetail({nodeId}: {nodeId: number}) {
  const accountId = useAuthStore((state) => state.accountId);
  const client = useQueryClient();
  const nodesKey = ["scheduler", accountId, "supplier", "nodes"];
  const findNode = (list: ComputeNode[] | undefined) => list?.find((item) => item.id === nodeId);
  const nodes = useQuery({
    queryKey: nodesKey,
    queryFn: () => fetchSupplierNodes(),
    retry: false,
    staleTime: 0,
    // Poll while the backend is probing so the fingerprint and report appear without a manual refresh.
    refetchInterval: (query) => {
      const current = findNode(query.state.data);
      return current && isManagedNode(current) && onboardingStage(current) === "verifying" ? 5000 : false;
    },
  });
  const node = findNode(nodes.data);
  const stage = node ? onboardingStage(node) : null;
  const refresh = () => {
    void client.invalidateQueries({queryKey: nodesKey, exact: true});
    void client.invalidateQueries({queryKey: ["managed-node", nodeId]});
  };

  return (
    <section className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        actions={<Link className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground" href="/console/supplier/nodes"><InteractiveIcon icon={ArrowLeft} size={16} />返回节点管理</Link>}
        title={node ? `节点接入 · ${node.node_name}` : "节点接入"}
      />
      {nodes.isPending ? <Skeleton className="h-40 rounded-2xl" />
        : nodes.isError ? <ErrorState description={nodes.error.message} isPending={nodes.isFetching} onRetry={() => void nodes.refetch()} title="节点暂时无法加载" />
        : !node ? <EmptyState title="未找到该节点" description="节点可能已被删除，或不属于当前账号。" action={<Link className="underline underline-offset-4" href="/console/supplier/nodes">返回节点管理</Link>} />
        : !isManagedNode(node) ? <EmptyState title="该节点为心跳上报模式" description="心跳上报节点由你自行交付，无需平台接入流程。" />
        : <NodeWizard node={node} onChanged={refresh} stage={stage!} />}
    </section>
  );
}

function NodeWizard({node, onChanged, stage}: {node: ComputeNode; onChanged: () => void; stage: OnboardingStage}) {
  const current = steps.findIndex((step) => step.stages.includes(stage));
  return (
    <>
      <GlassCard className="px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            状态：<strong>{node.verify_status ? verifyStatusLabels[node.verify_status] : "待验证"}</strong>
            {node.schedulable === false ? <span className="ml-2 text-warning">已排空</span> : null}
            {node.last_probe_ok_at ? <span className="ml-3 text-xs text-muted">最近探活通过 {formatDateTime(node.last_probe_ok_at)}</span> : null}
          </p>
          <Button onPress={onChanged} size="sm" variant="outline">刷新</Button>
        </div>
        {stage === "suspended" ? (
          <p className="mt-3 text-sm text-danger" role="alert">该节点已被平台停用，不接受新的租约；如有疑问请联系运营。</p>
        ) : (
          <ol aria-label="接入步骤" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {steps.map((step, index) => (
              <li
                aria-current={index === current ? "step" : undefined}
                className={`rounded-xl border px-3 py-2 text-xs ${index === current ? "border-accent bg-accent/5 font-medium" : index < current ? "border-success/40 text-success" : "border-border text-muted"}`}
                key={step.id}
              >
                {String(index + 1).padStart(2, "0")} {step.label}
              </li>
            ))}
          </ol>
        )}
      </GlassCard>

      <Section title="1. 授权平台管理密钥">
        <OnboardingInfo nodeId={node.id} />
      </Section>
      <Section title="2. SSH 连接信息">
        <SshForm key={`${node.ssh_host}:${node.ssh_port}:${node.ssh_user}`} node={node} onSaved={onChanged} />
      </Section>
      {stage === "confirm_host_key" ? (
        <Section title="3. 确认主机指纹">
          <HostKeyConfirm node={node} onConfirmed={onChanged} />
        </Section>
      ) : null}
      {stage !== "ssh" && stage !== "suspended" ? (
        <Section title="探活">
          <VerifyActions node={node} onChanged={onChanged} stage={stage} />
          <div className="mt-4"><ProbeReports nodeId={node.id} polling={stage === "verifying"} /></div>
        </Section>
      ) : null}
      {stage === "verified" || stage === "failed" || stage === "reimage" ? (
        <Section title="卡槽">
          <SlotGrid nodeId={node.id} />
        </Section>
      ) : null}
    </>
  );
}

function Section({children, title}: {children: ReactNode; title: string}) {
  return (
    <GlassCard className="px-5 py-5 sm:px-6">
      <h2 className="mb-4 text-[15px] font-semibold">{title}</h2>
      {children}
    </GlassCard>
  );
}
