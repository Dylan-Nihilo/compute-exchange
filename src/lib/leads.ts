import {z} from "zod";

export type LeadType = "equipment" | "construction" | "finance_lease";

export interface LeadInput {
  type: LeadType;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  company_name?: string;
  description?: string;
  amount_range?: string;
  term?: string;
  source: string;
}

const envelopeSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z.object({id: z.number().int().positive()}).nullable().optional(),
});

// 留资需登录: 经 BFF 把 HttpOnly cookie 换成 Bearer 转发后端, 后端另有按账号限流。
export async function submitLead(
  input: LeadInput,
  fetchImplementation: typeof fetch = fetch,
): Promise<{id: number}> {
  let response: Response;
  try {
    response = await fetchImplementation("/api/leads", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify(input),
    });
  } catch {
    throw new Error("提交服务暂不可用, 请稍后再试");
  }
  let parsed: z.infer<typeof envelopeSchema>;
  try {
    parsed = envelopeSchema.parse(await response.json());
  } catch {
    throw new Error("提交失败, 请稍后再试");
  }
  if (!response.ok || parsed.code !== 0 || !parsed.data) {
    throw new Error(parsed.message || "提交失败, 请稍后再试");
  }
  return parsed.data;
}
