import {isSshFingerprint} from "./managed-nodes.ts";

// Client-side mirror of fleet RegisterManagedNode validation (backend/internal/fleet/service.go).
export const maxCardsPerManagedNode = 64;
export const maxLeasePortSpan = 1000;

export type ManagedNodeFieldState = {diskPerCardGb: string; portStart: string; portEnd: string; expectedFingerprint: string};

export const defaultManagedNodeFields: ManagedNodeFieldState = {diskPerCardGb: "", portStart: "40000", portEnd: "40099", expectedFingerprint: ""};

/** First validation problem, or null when the managed fields are acceptable for `cards` cards. */
export function managedNodeInputError(value: ManagedNodeFieldState, cards: number, containerDelivery: boolean): string | null {
  if (!Number.isInteger(cards) || cards < 1 || cards > maxCardsPerManagedNode) return `托管节点卡数须在 1-${maxCardsPerManagedNode} 之间`;
  const diskText = value.diskPerCardGb.trim();
  const disk = diskText ? Number(diskText) : 0;
  if (!Number.isInteger(disk) || disk < 0 || disk > 100_000) return "每卡数据盘须为 0-100000 的整数";
  if (containerDelivery && disk === 0) return "分卡容器交付须填写每卡数据盘（GB）";
  const start = Number(value.portStart);
  const end = Number(value.portEnd);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1024 || end > 65535 || start > end) return "租约端口段须在 1024-65535 内且起止有序";
  if (end - start + 1 > maxLeasePortSpan) return `租约端口段不能超过 ${maxLeasePortSpan} 个端口`;
  if (end - start + 1 < cards + 1) return "租约端口段过小：至少需要 卡数+1 个端口（含探活自检端口）";
  const fingerprint = value.expectedFingerprint.trim();
  if (fingerprint && !isSshFingerprint(fingerprint)) return "主机指纹格式应为 SHA256: 加 43 位字符";
  return null;
}

/** Request fields for an SSH-managed node, or null when invalid (see managedNodeInputError). */
export function managedNodeInput(value: ManagedNodeFieldState, cards: number, containerDelivery: boolean) {
  if (managedNodeInputError(value, cards, containerDelivery)) return null;
  const disk = value.diskPerCardGb.trim() ? Number(value.diskPerCardGb) : 0;
  const fingerprint = value.expectedFingerprint.trim();
  return {
    mgmt_mode: "ssh" as const,
    ...(disk > 0 ? {disk_per_card_gb: disk} : {}),
    lease_port_start: Number(value.portStart),
    lease_port_end: Number(value.portEnd),
    ...(fingerprint ? {expected_host_fingerprint: fingerprint} : {}),
  };
}
