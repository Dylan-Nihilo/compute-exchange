import type {
  QualificationStatus,
  Role,
  VerificationStatus,
} from "./contracts.ts";

export type {Role} from "./contracts.ts";

export type Capability =
  | "browse"
  | "authenticate"
  | "kyc"
  | "orderCompute"
  | "publishCompute"
  | "buyToken"
  | "publishEquipment"
  | "submitFinanceLead"
  | "viewFinanceLeads"
  | "reviewQualification"
  | "manageProducts"
  | "interveneOrder"
  | "viewFinance"
  | "configureSplit"
  | "manageCrm"
  | "manageRisk"
  | "manageTokens"
  | "manageCms"
  | "manageUsers"
  | "manageAccess"
  | "viewAudit"
  | "manageCompliance";

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
  publishEquipment: ["vendor", "operator", "admin"],
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
  const {grants = [], qualificationStatus, role, verificationStatus} = context;
  const baseAccess = allowedRoles[capability].includes(role) ? "allow" : "deny";

  if (baseAccess === "deny") return "deny";
  if (role === "operator" && capability !== "browse") {
    return grants.includes(capability) ? "allow" : "deny";
  }
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
