import {z} from "zod";

import {jsonInit, listPayload, requestEnvelope} from "./api/envelope.ts";
import {gpuSlotStates, nodeVerifyStatuses} from "./domain/contracts.ts";

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

const nodeIdPattern = /^[1-9]\d*$/;

function nodePath(nodeId: number | string, suffix: string) {
  const id = String(nodeId);
  if (!nodeIdPattern.test(id)) throw new Error("节点编号无效");
  return `/api/supplier/nodes/${id}/${suffix}`;
}

/** Command the supplier runs on the machine to read its host key fingerprint (backend also returns it). */
export const hostKeyCheckCommand = "ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub";

const hostKeyStateSchema = z.object({
  fingerprint: z.string().nullable(),
  confirmed: z.boolean(),
  confirmed_at: z.string().nullable(),
  check_command: z.string(),
});
export type HostKeyState = z.infer<typeof hostKeyStateSchema>;

const stringList = z.array(z.string()).nullable().transform((value) => value ?? []);

/** GET /supplier/nodes/:id/onboarding (managed-rental-api.md, fleet.Onboarding). */
const onboardingSchema = z.object({
  node_id: z.number().int().positive(),
  verify_status: z.enum(nodeVerifyStatuses),
  authorized_keys_line: z.string().min(1),
  controller_egress_ips: stringList,
  gateway_egress_ips: stringList,
  lease_port_start: z.number().int(),
  lease_port_end: z.number().int(),
  ssh_host: z.string().nullable(),
  ssh_port: z.number().int().nullable(),
  ssh_user: z.string().nullable(),
  host_key: hostKeyStateSchema,
  firewall_scripts: z.record(z.string(), z.string()).nullable().transform((value) => value ?? {}),
  requirements: stringList,
});
export type NodeOnboarding = z.infer<typeof onboardingSchema>;

export function fetchNodeOnboarding(nodeId: number, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "onboarding"), onboardingSchema, {
    fallback: "接入信息读取失败",
    fetchImplementation,
  });
}

/** `SHA256:` + 43 base64 chars without padding, exactly as the backend validates (fleet hostFPRe). */
const fingerprintPattern = /^SHA256:[A-Za-z0-9+/]{43}$/;
const fingerprintMessage = `指纹格式应为 SHA256: 加 43 位字符，即在机器上执行 ${hostKeyCheckCommand} 输出的第二列`;

/** Optional expected host fingerprint: blank means "not provided" (TOFU), otherwise it must be well-formed. */
export const expectedHostFingerprint = z
  .string()
  .trim()
  .refine((value) => value === "" || fingerprintPattern.test(value), fingerprintMessage)
  .transform((value) => value || undefined)
  .optional();

export const nodeSshInput = z.object({
  host: z.string().trim().min(1, "请填写主机地址").max(253, "主机地址过长"),
  port: z.number().int().min(1, "端口须在 1-65535 之间").max(65535, "端口须在 1-65535 之间"),
  // fleet sshUserRe: ^[a-z_][a-z0-9_-]{0,31}$
  user: z.string().trim().regex(/^[a-z_][a-z0-9_-]{0,31}$/, "管理账户须为小写字母/数字/下划线/短横线，以字母或下划线开头，不超过 32 位"),
  bootstrap_password: z.string().min(1).max(256).optional(),
  expected_host_fingerprint: expectedHostFingerprint,
});
export type NodeSshInput = z.input<typeof nodeSshInput>;

const fleetNodeSchema = z.object({
  id: z.number().int().positive(),
  verify_status: z.enum(nodeVerifyStatuses),
  schedulable: z.boolean(),
  ssh_host: z.string().nullable(),
  ssh_port: z.number().int().nullable(),
  ssh_user: z.string().nullable(),
  host_key_fingerprint: z.string().nullable(),
  host_key_confirmed_at: z.string().nullable(),
  last_probe_ok_at: z.string().nullable(),
}).passthrough();

const sshUpdateSchema = z.object({
  node: fleetNodeSchema,
  bootstrap: z.enum(["skipped", "installed"]),
  host_key: hostKeyStateSchema,
});
export type NodeSshUpdate = z.infer<typeof sshUpdateSchema>;

export function updateNodeSsh(nodeId: number, input: NodeSshInput, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "ssh"), sshUpdateSchema, {
    fallback: "SSH 信息保存失败",
    init: jsonInit("PUT", nodeSshInput.parse(input)),
    fetchImplementation,
  });
}

const taskIdSchema = z.object({task_id: z.number().int().nonnegative()});

export function startNodeVerify(nodeId: number, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "verify"), taskIdSchema, {
    fallback: "探活提交失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}

/** `task_id` 0 means SSH info is incomplete so no full probe was queued (managed-rental-api.md). */
export function confirmNodeHostKey(nodeId: number, fingerprint: string, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(
    nodePath(nodeId, "host-key/confirm"),
    z.object({confirmed: z.literal(true), task_id: z.number().int().nonnegative()}),
    {fallback: "指纹确认失败", init: jsonInit("POST", {fingerprint: fingerprint.trim()}), fetchImplementation},
  );
}

export function setNodeDrain(nodeId: number, drain: boolean, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, drain ? "drain" : "undrain"), z.object({schedulable: z.boolean()}), {
    fallback: drain ? "排空失败" : "恢复接单失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}

export function confirmNodeReimage(nodeId: number, fetchImplementation: typeof fetch = fetch) {
  return requestEnvelope(nodePath(nodeId, "reimage-confirm"), taskIdSchema, {
    fallback: "重装确认失败",
    init: jsonInit("POST"),
    fetchImplementation,
  });
}

/** Probe kinds (fleet ProbeReport.kind). */
export const probeKindLabels: Record<string, string> = {
  verify: "完整探活",
  port_recheck: "端口复测",
};

const probeCheckSchema = z.object({
  id: z.string(),
  name: z.string(),
  ok: z.boolean(),
  required: z.boolean(),
  // Present only when the check was not run because a prerequisite failed.
  skipped: z.boolean().optional().default(false),
  detail: z.string(),
});
export type ProbeCheck = z.infer<typeof probeCheckSchema>;

const probeGpuSchema = z.object({
  index: z.number().int().nonnegative(),
  uuid: z.string(),
  name: z.string(),
  memory_mib: z.number().int().nonnegative(),
  pci_bus_id: z.string(),
  driver_version: z.string(),
});

const probeInventorySchema = z.object({
  cpu_cores: z.number().int(),
  mem_gb: z.number().int(),
  disk_free_gb: z.number().int(),
  disk_path: z.string(),
  disk_quota_supported: z.boolean(),
  driver_version: z.string(),
  cuda_version: z.string(),
  os: z.string(),
  kernel: z.string(),
  docker_version: z.string(),
  gpus: z.array(probeGpuSchema).nullable().transform((value) => value ?? []),
  // JSON object keys are gpu_index strings.
  topo_groups: z.record(z.string(), z.string()).nullable().transform((value) => value ?? {}),
  faulty: z.record(z.string(), z.string()).optional(),
});
export type ProbeInventory = z.infer<typeof probeInventorySchema>;

const probeReportSchema = z.object({
  id: z.number().int().positive(),
  node_id: z.number().int().positive(),
  kind: z.string(),
  result: z.enum(["pass", "fail"]),
  checks: z.array(probeCheckSchema).nullable().transform((value) => value ?? []),
  // null when the connection stage failed or the host fingerprint still awaits confirmation.
  inventory: probeInventorySchema.nullable(),
  created_at: z.string(),
});
export type ProbeReport = z.infer<typeof probeReportSchema>;

/** GET /supplier/nodes/:id/probe-reports?limit= returns a plain array, newest first (limit 1-50). */
export function fetchProbeReports(nodeId: number, limit = 10, fetchImplementation: typeof fetch = fetch) {
  const bounded = Math.min(50, Math.max(1, Math.trunc(limit)));
  return requestEnvelope(
    `${nodePath(nodeId, "probe-reports")}?${new URLSearchParams({limit: String(bounded)})}`,
    listPayload(probeReportSchema),
    {fallback: "探活报告读取失败", fetchImplementation},
  );
}

const slotSchema = z.object({
  id: z.number().int().positive(),
  node_id: z.number().int().positive(),
  gpu_index: z.number().int().nonnegative(),
  gpu_uuid: z.string(),
  pci_bus_id: z.string(),
  vram_mb: z.number().int().nonnegative(),
  topo_group: z.string(),
  state: z.enum(gpuSlotStates),
  // Lease ID only; the backend never exposes the buyer behind it.
  lease_id: z.number().int().positive().nullable(),
  state_changed_at: z.string(),
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
  return requestEnvelope(
    nodePath(nodeId, `slots/${gpuIndex}`),
    z.object({gpu_index: z.number().int().nonnegative(), state: z.enum(["withheld", "free"])}),
    {fallback: "卡槽状态修改失败", init: jsonInit("PUT", {state: withheld ? "withheld" : "free"}), fetchImplementation},
  );
}

/** Host fingerprint as printed by `ssh-keygen -lf`: `SHA256:` + 43 base64 chars, no padding. */
export function isSshFingerprint(value: string) {
  return fingerprintPattern.test(value.trim());
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

type StageInput = Pick<NodeOnboarding, "ssh_host" | "verify_status"> & {
  host_key: Pick<HostKeyState, "fingerprint" | "confirmed">;
};

/**
 * Where an SSH node sits in the docs/25 §25.4.2 onboarding flow. Driven by GET .../onboarding,
 * the only supplier endpoint that returns ssh_host and host-key state (the node list does not).
 * A recorded but unconfirmed fingerprint (or `key_mismatch`) always asks for confirmation first.
 */
export function onboardingStage(node: StageInput): OnboardingStage {
  const status = node.verify_status;
  if (status === "suspended") return "suspended";
  if (!node.ssh_host) return "ssh";
  if (status === "key_mismatch") return "confirm_host_key";
  if (node.host_key.fingerprint && !node.host_key.confirmed) return "confirm_host_key";
  if (status === "needs_reimage") return "reimage";
  if (status === "verifying") return "verifying";
  if (status === "verified") return "verified";
  if (status === "failed") return "failed";
  return "verify";
}
