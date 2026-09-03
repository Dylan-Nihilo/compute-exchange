import {z} from "zod";

import {assertAuthenticatedAccountApi} from "./auth/api.ts";
import {identityApplicationInputSchema, type IdentityApplicationInput} from "./auth/contracts.ts";

type SupplierApplicationInput = Extract<IdentityApplicationInput, {requestedRole: "supplier"}>;

const qualificationSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  status: z.string(),
  created_at: z.string(),
});
const itemEnvelope = z.object({code: z.number(), message: z.string(), data: qualificationSchema.optional()});
const listEnvelope = z.object({code: z.number(), message: z.string(), data: z.array(qualificationSchema).nullable().optional()});

export async function submitSupplierApplication(
  input: SupplierApplicationInput,
  expectedAccountId: string,
  fetchImplementation: typeof fetch = fetch,
) {
  const parsed = identityApplicationInputSchema.safeParse(input);
  if (!parsed.success || parsed.data.requestedRole !== "supplier") throw new Error(parsed.error?.issues[0]?.message ?? "供给方申请资料不完整");
  const data = parsed.data;
  const body = new FormData();
  body.set("company_name", data.companyName);
  body.set("credit_code", data.creditCode);
  body.set("representative", data.representative);
  body.set("representative_id_number", data.representativeIdNumber);
  body.set("business_license", data.businessLicenseFile);
  body.set("contact_method", data.contactMethod);
  body.set("bank_name", data.bankName);
  body.set("account_name", data.accountName);
  body.set("account_number", data.accountNumber);
  body.set("facility_address", data.facilityAddress);
  body.set("has_idc_license", String(data.hasIdcLicense));
  body.set("power_description", data.powerDescription);
  body.set("cooling_description", data.coolingDescription);
  await assertAuthenticatedAccountApi(expectedAccountId, fetchImplementation);
  const result = await request("/api/supplier-applications", itemEnvelope, {
    method: "POST",
    body,
  }, fetchImplementation);
  if (!result.data) throw new Error("供给方申请服务返回格式错误");
  return toPendingApplication(result.data);
}

export async function fetchSupplierApplications(accountId: string, fetchImplementation: typeof fetch = fetch) {
  const result = await request("/api/supplier-applications", listEnvelope, undefined, fetchImplementation);
  return (result.data ?? []).map((item) => ({
    ...toApplication(item),
    accountId,
  }));
}

function toApplication(item: z.infer<typeof qualificationSchema>) {
  return {
    id: String(item.id),
    accountId: String(item.user_id),
    requestedRole: "supplier" as const,
    qualificationId: String(item.id),
    status: item.status === "verified" ? "approved" as const : item.status === "rejected" ? "rejected" as const : "pending" as const,
    submittedAt: item.created_at,
  };
}

function toPendingApplication(item: z.infer<typeof qualificationSchema>) {
  return {...toApplication(item), status: "pending" as const};
}

async function request<T extends {code: number; message: string}>(url: string, schema: z.ZodType<T>, init: RequestInit | undefined, fetchImplementation: typeof fetch) {
  let response: Response;
  try { response = await fetchImplementation(url, {...init, cache: "no-store"}); }
  catch { throw new Error("供给方申请服务暂不可用"); }
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("供给方申请服务返回格式错误");
  if (!response.ok || parsed.data.code !== 0) throw new Error(parsed.data.message || "供给方申请未完成");
  return parsed.data;
}
