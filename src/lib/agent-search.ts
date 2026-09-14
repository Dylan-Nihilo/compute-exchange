import {z} from "zod";

import {ApiError, createApiClient} from "./api/client.ts";
import {computeProductSchema} from "./market-api.ts";

export const agentSearchQuerySchema = z.string().trim().min(1, "请描述算力需求").refine((value) => [...value].length <= 500, "需求描述最多500字");
const estimateSchema = z.object({total_vram_gb: z.number().nonnegative(), per_card_vram_gb: z.number().nonnegative(), min_cards: z.number().int().nonnegative(), compute_class: z.string(), basis: z.string()});
const resultSchema = z.discriminatedUnion("relevant", [
  z.object({relevant: z.literal(false), reject_reason: z.string().optional()}),
  z.object({relevant: z.literal(true),
    analysis_steps: z.array(z.object({title: z.string(), detail: z.string()})).nullable().transform((value) => value ?? []),
    compute_estimate: estimateSchema,
    requirement: z.object({purpose: z.string(), gpu_models: z.array(z.string()).nullable().transform((value) => value ?? []), card_count: z.number().int().nonnegative(), pricing_mode: z.string(), duration_hint: z.number().int().nonnegative(), budget_fen_max: z.number().int().nonnegative(), region: z.string()}),
    matches: z.array(z.object({product: computeProductSchema, score: z.number().int().min(0).max(100), reasons: z.array(z.string()).nullable().transform((value) => value ?? [])})).nullable().transform((value) => value ?? []),
    note: z.string().optional(),
  }),
]);
export type AgentSearchResult = z.infer<typeof resultSchema>;

export async function searchCompute(query: string, fetchImplementation = fetch, signal?: AbortSignal) {
  const input = agentSearchQuerySchema.parse(query);
  let response;
  try {
    response = await createApiClient({baseUrl: "/api", fetchImplementation, timeoutMs: 70000}).request("/market/agent-search",
      z.object({code: z.number(), message: z.string().optional(), data: z.unknown().optional()}),
      {method: "POST", json: {query: input}, cache: "no-store", signal});
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) throw new ApiError(error.status === 401 ? "登录已过期，请重新登录后再试" : "当前账号暂无使用权限", {status: error.status});
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) throw new Error("分析已中断或超时，请稍后重试");
    throw new Error("智能选型暂不可用，请稍后重试");
  }
  if (response.code !== 0) {
    const message = response.code === 40100 ? "登录已过期，请重新登录后再试" : response.code === 42900 ? "请求较频繁，请稍后再试" : response.code === 40001 ? response.message || "请检查需求描述" : "智能选型暂不可用，请稍后重试，或使用市场筛选";
    throw new ApiError(message, {code: String(response.code), status: response.code === 40100 ? 401 : 200});
  }
  const result = resultSchema.safeParse(response.data);
  if (!result.success) throw new Error("选型结果不完整，请重新分析");
  return result.data;
}
