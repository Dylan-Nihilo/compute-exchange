"use client";

import {useParams} from "next/navigation";

import {ManagedNodeDetail} from "@/components/scheduler/managed-node/node-detail";
import {EmptyState} from "@/components/workspace/ui/empty-state";

export default function Page() {
  const {nodeId} = useParams<{nodeId: string}>();
  if (!/^[1-9]\d*$/.test(nodeId ?? "")) {
    return <EmptyState title="节点编号无效" description="请从节点管理列表进入。" />;
  }
  return <ManagedNodeDetail nodeId={Number(nodeId)} />;
}
