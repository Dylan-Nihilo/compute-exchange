"use client";

import {useQuery} from "@tanstack/react-query";
import Link from "next/link";
import {useParams} from "next/navigation";

import {SectionQueryState} from "@/components/managed/query-states";
import {DeploymentsWorkspace} from "@/components/workspace/buyer/deploy/deployments-workspace";
import {managedAccessKey} from "@/components/workspace/buyer/managed/managed-access-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {fetchBuyerOrderDetail, isBuyerOrderNo, isManagedBuyerOrder} from "@/lib/buyer-orders";
import {fetchManagedAccess, leaseStateCopy} from "@/lib/managed-orders";

/** One-click model deployment for a managed order whose lease is active (docs/27 §27.8). */
export default function BuyerOrderDeploymentsPage() {
  const {orderId} = useParams<{orderId: string}>();
  const valid = isBuyerOrderNo(orderId);
  const order = useQuery({
    enabled: valid,
    queryKey: ["buyer", "orders", "detail", orderId, "deploy-gate"],
    queryFn: () => fetchBuyerOrderDetail(orderId),
    retry: false,
  });
  const managed = order.data ? isManagedBuyerOrder(order.data) : false;
  const access = useQuery({
    enabled: valid && managed,
    queryKey: managedAccessKey(orderId),
    queryFn: () => fetchManagedAccess(orderId),
    retry: false,
  });

  return (
    <section className="mx-auto w-full max-w-[1228px] space-y-5 px-4 pt-8 pb-10 sm:px-6 xl:px-8">
      <WorkspacePageHeader
        actions={<Link className="text-sm text-muted hover:text-foreground" href={`/console/buyer/orders/${encodeURIComponent(orderId)}`}>返回订单详情</Link>}
        title="模型部署"
      />
      {!valid ? (
        <p className="text-sm text-danger" role="alert">订单号格式不正确。</p>
      ) : (
        <SectionQueryState
          error={order.error ?? access.error}
          isError={order.isError || access.isError}
          isPending={order.isPending || (managed && access.isPending)}
          isRefetching={order.isFetching || access.isFetching}
          loadingText="正在读取订单与租约状态"
          notOpenText="托管租约接口暂未开放。"
          onRetry={() => void (order.isError ? order.refetch() : access.refetch())}
        >
          {!managed ? (
            <p className="text-sm text-muted">一键部署仅适用于平台托管的零租订单，该订单由供给方人工开通。</p>
          ) : access.data && access.data.lease_state !== "active" ? (
            <p className="text-sm text-muted">
              租约当前为「{leaseStateCopy[access.data.lease_state] ?? access.data.lease_state}」，租约为「可登录」状态时才可部署和管理模型（包夜窗口外部署会随窗口自动停止和恢复）。
            </p>
          ) : access.data ? (
            <DeploymentsWorkspace access={access.data} orderNo={orderId} />
          ) : null}
        </SectionQueryState>
      )}
    </section>
  );
}
