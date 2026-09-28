import {z} from "zod";

import {ApiError} from "./api/client.ts";
import {agentSearchQuerySchema, agentSearchResultSchema, type AgentSearchResult} from "./agent-search.ts";

const summarySchema = z.object({text: z.string().refine((value) => [...value].length <= 120)});
const resultSchema = z.object({code: z.literal(0), data: agentSearchResultSchema});
const errorSchema = z.object({code: z.number(), message: z.string().optional()});
const interrupted = "评估连接中断，需求已保留，请重新评估";

function apiFailure(status: number, code?: number) {
  if (status === 401 || code === 40100) return new ApiError("登录已过期，请重新登录后再试", {status: 401});
  if (status === 403) return new ApiError("当前账号暂无使用权限", {status: 403});
  if (status === 429 || code === 42900) return new ApiError("请求较频繁，请稍后再试", {status: 429});
  return new ApiError(code === 40001 ? "请检查需求描述，最多 500 字" : "算力评估暂不可用，请稍后重试", {status});
}

export async function streamCompute(query: string, onSummary: (text: string) => void, fetchImplementation = fetch, signal?: AbortSignal): Promise<AgentSearchResult> {
  const input = agentSearchQuerySchema.parse(query);
  const timeout = AbortSignal.timeout(70000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetchImplementation("/api/market/agent-search/stream", {
      method: "POST", credentials: "include", cache: "no-store", signal: requestSignal,
      headers: {"content-type": "application/json", accept: "text/event-stream"}, body: JSON.stringify({query: input}),
    });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/event-stream")) {
      const payload = errorSchema.safeParse(await response.json().catch(() => null));
      throw apiFailure(response.status, payload.success ? payload.data.code : undefined);
    }
    if (!response.body) throw new Error(interrupted);
    reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", {fatal: true});
    let buffer = "", received = 0, lastSummary = "";
    while (true) {
      const {done, value} = await reader.read();
      if (requestSignal.aborted) throw requestSignal.reason;
      received += value?.byteLength ?? 0;
      if (received > 4 * 1024 * 1024) throw new Error(interrupted);
      buffer = (buffer + decoder.decode(value, {stream: !done})).replace(/\r\n/g, "\n");
      if (buffer.length > 256 * 1024) throw new Error(interrupted);
      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        let event = "message";
        const data: string[] = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
        }
        if (!data.length || !["summary", "result", "error"].includes(event)) continue;
        const payload = JSON.parse(data.join("\n"));
        if (event === "error") throw apiFailure(200, errorSchema.parse(payload).code);
        if (event === "result") return resultSchema.parse(payload).data;
        const {text} = summarySchema.parse(payload);
        if (!text.startsWith(lastSummary)) throw new Error(interrupted);
        if (text !== lastSummary) {onSummary(text); lastSummary = text;}
      }
      if (done) throw new Error(interrupted);
    }
  } catch (error) {
    if (requestSignal.aborted) throw new Error("评估已停止或超时，请稍后重试");
    if (error instanceof ApiError) throw error;
    throw new Error(interrupted);
  } finally {
    await reader?.cancel().catch(() => {});
  }
}
