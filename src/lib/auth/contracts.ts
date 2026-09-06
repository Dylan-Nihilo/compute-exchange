import {z} from "zod";

import type {Role, VerificationStatus} from "../domain/contracts.ts";
import type {Capability} from "../domain/permissions.ts";

export type SessionAccount = {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  roles: Exclude<Role, "guest">[];
  verificationStatus: VerificationStatus;
  grants: Capability[];
};

const requiredText = z.string().trim().min(1, "请填写完整资料");
const creditCode = z.string().trim().length(18, "统一社会信用代码需为 18 位").transform((value) => value.toUpperCase());
const accountNumber = z.string().trim().regex(/^\d{8,32}$/, "银行账号需为 8–32 位数字");
const identityDocumentNumber = z.string().trim().regex(/^(?:\d{15}|\d{17}[\dXx])$/, "证件号需为 15 位数字，或 18 位且末位可为 X");
const businessLicenseFile = z
  .custom<File>((value) => typeof File !== "undefined" && value instanceof File, {error: "请选择营业执照文件"})
  .refine((file) => file.size <= 5 * 1024 * 1024, "营业执照文件需小于 5MB")
  .refine((file) => ["application/pdf", "image/jpeg", "image/png"].includes(file.type), "营业执照仅支持 PDF、JPG 或 PNG");

export const verificationInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("personal"),
    sensitiveDataAgreed: z.literal(true, {error: "请单独同意认证所需的敏感个人信息处理"}),
    legalName: requiredText,
    identityNumber: identityDocumentNumber,
    faceVerified: z.literal(true, {error: "请确认身份信息真实有效"}),
  }),
  z.object({
    kind: z.literal("enterprise"),
    sensitiveDataAgreed: z.literal(true, {error: "请单独同意认证所需的敏感个人信息处理"}),
    companyName: requiredText,
    creditCode,
    representative: requiredText,
    representativeIdNumber: identityDocumentNumber,
    businessLicenseFileName: requiredText,
    businessLicenseFile: businessLicenseFile.optional(),
    bankName: requiredText,
    accountName: requiredText,
    accountNumber,
  }),
]);

const identityEnterpriseFields = {
  companyName: requiredText,
  creditCode,
  representative: requiredText,
  representativeIdNumber: identityDocumentNumber,
  businessLicenseFileName: requiredText,
  contactMethod: requiredText,
  bankName: requiredText,
  accountName: requiredText,
  accountNumber,
};

export const identityApplicationInputSchema = z.discriminatedUnion("requestedRole", [
  z.object({
    requestedRole: z.literal("supplier"),
    ...identityEnterpriseFields,
    businessLicenseFile,
    facilityAddress: requiredText,
    hasIdcLicense: z.literal(true, {error: "请确认已具备 IDC 经营资质"}),
    powerDescription: requiredText,
    coolingDescription: requiredText,
  }),
  z.object({requestedRole: z.literal("vendor"), ...identityEnterpriseFields}),
  z.object({requestedRole: z.literal("funder"), ...identityEnterpriseFields}),
]);

export type VerificationInput = z.infer<typeof verificationInputSchema>;
export type IdentityApplicationInput = z.infer<typeof identityApplicationInputSchema>;
