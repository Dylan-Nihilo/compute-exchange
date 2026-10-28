"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {SectionQueryState} from "@/components/managed/query-states";
import {errorMessage} from "@/lib/api/envelope";
import {formatDateTime} from "@/lib/format/date";
import {fetchNodeSlots, setSlotWithheld, slotStateLabels, type GpuSlot} from "@/lib/managed-nodes";
import {notify} from "@/lib/notify";

const stateTone: Record<GpuSlot["state"], string> = {
  free: "border-success/40 bg-success/5",
  reserved: "border-warning/40 bg-warning/5",
  leased: "border-accent/40 bg-accent/5",
  draining: "border-warning/40 bg-warning/5",
  faulty: "border-danger/40 bg-danger/5",
  withheld: "border-border bg-surface-secondary",
};

// docs/25 §25.10: suppliers can only toggle free <-> withheld; leased slots return 40900.
export function SlotGrid({nodeId}: {nodeId: number}) {
  const client = useQueryClient();
  const queryKey = ["managed-node", nodeId, "slots"];
  const query = useQuery({queryKey, queryFn: () => fetchNodeSlots(nodeId), retry: false, refetchInterval: 30_000});
  const toggle = useMutation({
    mutationFn: ({gpuIndex, withheld}: {gpuIndex: number; withheld: boolean}) => setSlotWithheld(nodeId, gpuIndex, withheld),
    onSuccess: (_data, {withheld}) => notify.success(withheld ? "卡槽已设为自留，不再计入可售" : "卡槽已释放为可售"),
    onError: (error) => notify.error(errorMessage(error, "卡槽状态修改失败")),
    onSettled: () => client.invalidateQueries({queryKey}),
  });

  return (
    <SectionQueryState
      emptyText="探活通过后，平台会按 GPU 清单生成卡槽。"
      error={query.error}
      isEmpty={!query.data?.length}
      isError={query.isError}
      isPending={query.isPending}
      isRefetching={query.isFetching}
      loadingText="正在读取卡槽"
      onRetry={() => void query.refetch()}
    >
      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {query.data?.map((slot) => {
          const togglable = slot.state === "free" || slot.state === "withheld";
          const pending = toggle.isPending && toggle.variables?.gpuIndex === slot.gpu_index;
          return (
            <li className={`rounded-xl border px-3 py-2.5 ${stateTone[slot.state]}`} key={slot.gpu_index}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">GPU {slot.gpu_index}</span>
                <span className="text-xs">{slotStateLabels[slot.state]}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {slot.vram_mb ? `${Math.round(slot.vram_mb / 1024)} GB` : "显存未知"}
                {slot.topo_group ? ` · 拓扑组 ${slot.topo_group}` : ""}
              </p>
              {slot.lease_no ? <p className="mt-0.5 font-mono text-xs text-muted">租约 {slot.lease_no}</p> : null}
              {slot.state_changed_at ? <p className="mt-0.5 text-xs text-muted">变更于 {formatDateTime(slot.state_changed_at)}</p> : null}
              {togglable ? (
                <Button
                  className="mt-2"
                  isDisabled={toggle.isPending && !pending}
                  isPending={pending}
                  onPress={() => toggle.mutate({gpuIndex: slot.gpu_index, withheld: slot.state === "free"})}
                  size="sm"
                  variant="ghost"
                >
                  {slot.state === "free" ? "设为自留" : "释放为可售"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </SectionQueryState>
  );
}
