"use client";

import {useQuery} from "@tanstack/react-query";

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
      {leaseStarted ? (
        <>
          <ManagedOutagesCard accessRemedy={access.data?.outage_remedy} leaseState={access.data?.lease_state} orderNo={orderNo} />
          <ManagedSessionsCard orderNo={orderNo} />
        </>
      ) : null}
    </>
  );
}
