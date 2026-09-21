import type {
  QualificationStatus,
  Role,
  VerificationStatus,
} from "./contracts.ts";

export type {Role} from "./contracts.ts";

export const capabilities = [
  "browse",
  "authenticate",
  "kyc",
  "orderCompute",
  "publishCompute",
  "buyToken",
  "publishEquipment",
  "submitFinanceLead",
  "viewFinanceLeads",
  "reviewQualification",
  "manageProducts",
  "interveneOrder",
  "viewFinance",
  "configureSplit",
  "manageCrm",
  "manageRisk",
  "manageTokens",
  "manageCms",
  "manageUsers",
  "manageAccess",
  "viewAudit",
  "manageCompliance",
] as const;
export type Capability = (typeof capabilities)[number];

export type AccessLevel = "allow" | "conditional" | "deny";

export interface AccessContext {
  role: Role;
  verificationStatus: VerificationStatus;
  qualificationStatus?: QualificationStatus;
  grants?: readonly Capability[];
}

const allowedRoles: Record<Capability, readonly Role[]> = {
  browse: ["guest", "buyer", "supplier", "vendor", "funder", "operator", "admin"],
  authenticate: ["guest", "buyer", "supplier", "vendor", "funder"],
  kyc: ["buyer", "supplier", "vendor", "funder"],
  orderCompute: ["buyer"],
  publishCompute: ["supplier", "operator", "admin"],
  buyToken: ["buyer", "supplier", "vendor", "funder"],
  // 平台只有供应方/采购方/运营方三种业务角色: 设备发布归 supplier。
  // vendor 是历史设计(设备厂商)遗留枚举, 无入驻通道, 不再授予任何能力。
  publishEquipment: ["supplier", "operator", "admin"],
  submitFinanceLead: ["guest", "buyer", "supplier", "vendor"],
  viewFinanceLeads: ["funder", "operator", "admin"],
  reviewQualification: ["operator", "admin"],
  manageProducts: ["operator", "admin"],
  interveneOrder: ["operator", "admin"],
  viewFinance: ["operator", "admin"],
  configureSplit: ["operator", "admin"],
  manageCrm: ["operator", "admin"],
  manageRisk: ["operator", "admin"],
  manageTokens: ["operator", "admin"],
  manageCms: ["operator", "admin"],
  manageUsers: ["operator", "admin"],
  manageAccess: ["admin"],
  viewAudit: ["operator", "admin"],
  manageCompliance: ["admin"],
};

const verificationRequired: readonly Capability[] = [
  "orderCompute",
  "buyToken",
  "publishCompute",
  "publishEquipment",
  "viewFinanceLeads",
];

const qualificationRequired: readonly Capability[] = [
  "publishCompute",
  "publishEquipment",
  "viewFinanceLeads",
];

export function accessFor(
  context: AccessContext,
  capability: Capability,
): AccessLevel {
  const {qualificationStatus, role, verificationStatus} = context;
  // The live API authorizes roles; prototype grants are not part of that contract.
  const baseAccess = allowedRoles[capability].includes(role) ? "allow" : "deny";

  if (baseAccess === "deny") return "deny";
  if (role === "admin") return "allow";
  if (
    verificationRequired.includes(capability) &&
    verificationStatus !== "verified"
  ) {
    return "conditional";
  }
  if (
    qualificationRequired.includes(capability) &&
    qualificationStatus !== "approved"
  ) {
    return "conditional";
  }

  return baseAccess;
}
