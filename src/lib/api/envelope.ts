import {z, type ZodType} from "zod";

/**
 * Error raised for a backend envelope `{code, message, data}` that is not a success.
 * Keeps the numeric backend code and `data` (e.g. 40001 `data.checks`) so pages can render
 * the real reason instead of a generic failure.
 */
export class BackendRequestError extends Error {
  readonly code: number | null;
  readonly status: number;
  readonly data: unknown;
  /** True when the BFF reports the backend endpoint is not released yet (HTTP 501). */
  readonly notOpen: boolean;

  constructor(
    message: string,
    {code, data, status}: {code: number | null; data?: unknown; status: number},
  ) {
    super(message);
    this.name = "BackendRequestError";
    this.code = code;
    this.data = data;
    this.status = status;
    this.notOpen = status === 501;
  }
}

export function isBackendRequestError(value: unknown): value is BackendRequestError {
  return value instanceof BackendRequestError;
}

export function isNotOpenError(value: unknown) {
  return isBackendRequestError(value) && value.notOpen;
}

const envelopeSchema = z.object({
  code: z.number().int(),
  message: z.string().optional().default(""),
  data: z.unknown().optional(),
});

export interface EnvelopeRequestOptions {
  /** Message when the request succeeds at HTTP level but the backend reports no message. */
  fallback: string;
  /** Message when the network request itself fails. */
  unavailable?: string;
  init?: RequestInit;
  fetchImplementation?: typeof fetch;
}

/**
 * Fetches a same-origin BFF route and validates the envelope plus `data` against `schema`.
 * Never fabricates a response: transport, format and business failures all throw.
 */
export async function requestEnvelope<T>(
  url: string,
  schema: ZodType<T>,
  {fallback, unavailable = "服务暂不可用", init, fetchImplementation = fetch}: EnvelopeRequestOptions,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImplementation(url, {cache: "no-store", ...init});
  } catch {
    throw new BackendRequestError(unavailable, {code: null, status: 0});
  }

  const envelope = envelopeSchema.safeParse(await response.json().catch(() => null));
  if (!envelope.success) {
    throw new BackendRequestError("服务返回格式错误", {code: null, status: response.status});
  }
  if (!response.ok || envelope.data.code !== 0) {
    throw new BackendRequestError(envelope.data.message || fallback, {
      code: envelope.data.code,
      data: envelope.data.data,
      status: response.status,
    });
  }

  const data = schema.safeParse(envelope.data.data);
  if (!data.success) {
    throw new BackendRequestError("服务返回格式错误", {code: 0, status: response.status});
  }
  return data.data;
}

export function jsonInit(method: "POST" | "PUT" | "DELETE", body?: unknown): RequestInit {
  return body === undefined
    ? {method}
    : {method, headers: {"content-type": "application/json"}, body: JSON.stringify(body)};
}

/** Accepts `list`-paged, bare-array and null list payloads, which backend endpoints mix. */
export function listPayload<T extends ZodType>(item: T) {
  return z
    .union([
      z.array(item),
      z.object({list: z.array(item).nullable()}),
      z.null(),
      z.undefined(),
    ])
    .transform((value): z.infer<T>[] => {
      if (Array.isArray(value)) return value;
      return value?.list ?? [];
    });
}

export function errorMessage(error: unknown, fallback = "请求失败") {
  return error instanceof Error && error.message ? error.message : fallback;
}
