import {z} from "zod";

import {jsonInit, listPayload, requestEnvelope} from "./api/envelope.ts";
import {gpuSlotStates, nodeVerifyStatuses, probeCheckIds} from "./domain/contracts.ts";

// v1.2 managed node onboarding, probing and card slots (tokenFactory docs/25 §25.4, §25.10).

export const verifyStatusLabels: Record<(typeof nodeVerifyStatuses)[number], string> = {
  unverified: "待验证",
  verifying: "探活中",
  verified: "已验证",
  failed: "探活未通过",
  key_mismatch: "主机指纹不一致",
  needs_reimage: "待重装确认",
  suspended: "已被平台停用",
};

export const slotStateLabels: Record<(typeof gpuSlotStates)[number], string> = {
  free: "空闲",
  reserved: "已预留",
  leased: "租用中",
  draining: "回收中",
  faulty: "故障",
  withheld: "自留",
};

/** docs/25 §25.4.3 probe checks; "required" marks the mandatory ones (P10 is advisory). */
export const probeCheckLabels: Record<(typeof probeCheckIds)[number], {label: string; required: boolean}> = {
  P1: {label: "TCP 可达", required: true},
  P2: {label: "SSH 握手与指纹", required: true},
  P3: {label: "管理密钥认证", required: true},
  P4: {label: "GPU 清单", required: true},
  P5: {label: "声明一致性", required: true},
  P6: {label: "拓扑", required: true},
  P7: {label: "健康（ECC / Xid）", required: true},
  P8: {label: "主机资源", required: true},
  P9: {label: "容器运行时", required: true},
  P10: {label: "磁盘配额能力", required: false},
  P11: {label: "租约端口：网关可达", required: true},
  P12: {label: "租约端口：未裸露", required: true},
  P13: {label: "短压测", required: true},
};

const nodeIdPattern = /^[1-9]\d*$/;

function nodePath(nodeId: number | string, suffix: string) {
  const id = String(nodeId);
  if (!nodeIdPattern.test(id)) throw new Error("节点编号无效");
  return `/api/supplier/nodes/${id}/${suffix}`;
}

/**
 * docs/25 only says onboarding returns "the management public key line (with from=), control
 * plane egress IPs, gateway egress IPs and per-distro firewall scripts"; field names below are
 * this client's assumption and are validated strictly so a mismatch surfaces as an error.
 */
const onboardingSchema = z.object({
  authorized_key: z.string().min(1),
  control_plane_ips: z.array(z.string()).nullable().optional(),
  gateway_egress_ips: z.array(z.string()).nullable().optional(),
  firewall_scripts: z.record(z.string(), z.string()).nullable().optional(),
});
export type NodeOnboarding = z.infer<typeof onboardingSchema>;

export function fetchNodeOnboarding(nodeId: number, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "onboarding"), onboardingSchema, {
    fallback: "接入信息读取失败",
    fetchImplementation,
  });
}

export const nodeSshInput = z.object({
  host: z.string().trim().min(1, "请填写主机地址").max(255),
  port: z.number().int().min(1).max(65535),
  user: z.string().trim().min(1, "请填写管理账户").max(64),
  bootstrap_password: z.string().min(1).max(256).optional(),
});
export type NodeSshInput = z.infer<typeof nodeSshInput>;

const anyData = z.unknown();

export function updateNodeSsh(nodeId: number, input: NodeSshInput, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "ssh"), anyData, {
    fallback: "SSH 信息保存失败",
    init: jsonInit("PUT", nodeSshInput.parse(input)),
    fetchImplementation,
  });
}

export function startNodeVerify(nodeId: number, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(
    nodePath(nodeId, "verify"),
    z.object({task_id: z.number().int().positive()}).partial().passthrough().nullable(),
    {fallback: "探活提交失败", init: jsonInit("POST"), fetchImplementation},
  );
}

export function confirmNodeHostKey(nodeId: number, fingerprint: string, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "host-key/confirm"), anyData, {
    fallback: "指纹确认失败",
    init: jsonInit("POST", {fingerprint: fingerprint.trim()}),
    fetchImplementation,
  });
}

export function setNodeDrain(nodeId: number, drain: boolean, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, drain ? "drain" : "undrain"), anyData, {
    fallback: drain ? "排空失败" : "恢复接单失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}

export function confirmNodeReimage(nodeId: number, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "reimage-confirm"), anyData, {
    fallback: "重装确认失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}

const probeCheckSchema = z.object({
  id: z.string(),
  ok: z.boolean().nullable(),
  detail: z.string().nullable().optional(),
});

const probeReportSchema = z.object({
  id: z.number().int().positive(),
  kind: z.string(),
  result: z.enum(["pass", "fail"]),
  checks: z.array(probeCheckSchema).nullable().transform((value) => value ?? []),
  created_at: z.string(),
});
export type ProbeReport = z.infer<typeof probeReportSchema>;

export function fetchProbeReports(nodeId: number, limit = 10, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(
    `${nodePath(nodeId, "probe-reports")}?${new URLSearchParams({limit: String(limit)})}`,
    listPayload(probeReportSchema),
    {fallback: "探活报告读取失败", fetchImplementation},
  );
}

const slotSchema = z.object({
  gpu_index: z.number().int().nonnegative(),
  gpu_uuid: z.string().optional(),
  pci_bus_id: z.string().optional(),
  vram_mb: z.number().int().nonnegative().optional(),
  topo_group: z.string().optional(),
  state: z.enum(gpuSlotStates),
  lease_no: z.string().nullable().optional(),
  state_changed_at: z.string().nullable().optional(),
});
export type GpuSlot = z.infer<typeof slotSchema>;

export function fetchNodeSlots(nodeId: number, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "slots"), listPayload(slotSchema), {
    fallback: "卡槽读取失败",
    fetchImplementation,
  });
}

export function setSlotWithheld(
  nodeId: number,
  gpuIndex: number,
  withheld: boolean,
  fetchImplementation: typeof fetch = fetch,
) {
  if (!Number.isInteger(gpuIndex) || gpuIndex < 0) throw new Error("卡槽编号无效");
  return requestEnvelope(nodePath(nodeId, `slots/${gpuIndex}`), anyData, {
    fallback: "卡槽状态修改失败",
    init: jsonInit("PUT", {state: withheld ? "withheld" : "free"}),
    fetchImplementation,
  });
}

/** Host fingerprint as printed by `ssh-keygen -lf`, e.g. `SHA256:base64`. */
export function isSshFingerprint(value: string) {
  return /^SHA256:[A-Za-z0-9+/]{43}=?$/.test(value.trim());
}

export type OnboardingStage =
  | "ssh"
  | "verify"
  | "verifying"
  | "confirm_host_key"
  | "reimage"
  | "verified"
  | "failed"
  | "suspended";

type StageInput = {
  ssh_host?: string | null;
  verify_status?: (typeof nodeVerifyStatuses)[number];
  host_key_fingerprint?: string | null;
  host_key_confirmed_at?: string | null;
};

/**
 * Where an SSH node sits in the docs/25 §25.4.2 onboarding flow, derived only from backend fields.
 * A recorded but unconfirmed fingerprint (or `key_mismatch`) always asks for confirmation first.
 */
export function onboardingStage(node: StageInput): OnboardingStage {
  const status = node.verify_status ?? "unverified";
  if (status === "suspended") return "suspended";
  if (!node.ssh_host) return "ssh";
  if (status === "key_mismatch") return "confirm_host_key";
  if (node.host_key_fingerprint && !node.host_key_confirmed_at) return "confirm_host_key";
  if (status === "needs_reimage") return "reimage";
  if (status === "verifying") return "verifying";
  if (status === "verified") return "verified";
  if (status === "failed") return "failed";
  return "verify";
}
