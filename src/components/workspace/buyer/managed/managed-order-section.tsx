"use client";

import {useQuery} from "@tanstack/react-query";
import Link from "next/link";

import {fetchManagedAccess} from "@/lib/managed-orders";

import {ManagedAccessCard, managedAccessKey} from "./managed-access-card";
import {ManagedOutagesCard} from "./managed-outages-card";
import {ManagedSessionsCard} from "./managed-sessions-card";

/**
 * Managed-order sections of the buyer order page. Rendered only when the backend marks the
 * order `fulfillment_mode=managed`; manual orders keep the original delivery UI.
 */
export function ManagedOrderSections({orderNo, provisioning}: {orderNo: string; provisioning: boolean}) {
  // Same key as ManagedAccessCard, so this shares one request and cache entry.
  const access = useQuery({
    queryKey: managedAccessKey(orderNo),
    queryFn: () => fetchManagedAccess(orderNo),
    retry: false,
  });
  const leaseStarted = access.data ? !["reserved", "pending", "provisioning", "cancelled"].includes(access.data.lease_state) : !provisioning;

  return (
    <>
      <ManagedAccessCard orderNo={orderNo} poll={provisioning} />
      {access.data?.lease_state === "active" ? <DeployEntry orderNo={orderNo} /> : null}
      {leaseStarted ? (
        <>
          <ManagedOutagesCard accessRemedy={access.data?.outage_remedy} leaseState={access.data?.lease_state} orderNo={orderNo} />
          <ManagedSessionsCard orderNo={orderNo} />
        </>
      ) : null}
    </>
  );
}

function DeployEntry({orderNo}: {orderNo: string}) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-surface p-5">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">模型部署</h2>
        <p className="mt-1 text-xs text-muted">在本租约的卡上一键部署开源模型，并查看健康状态与引擎日志。</p>
      </div>
      <Link
        className="rounded-full bg-[#173447] px-4 py-2 text-sm font-medium text-white hover:bg-[#1f4560]"
        href={`/console/buyer/orders/${encodeURIComponent(orderNo)}/deployments`}
      >
        进入模型部署
      </Link>
    </section>
  );
}
