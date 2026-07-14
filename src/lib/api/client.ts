import type {ZodType} from "zod";

export interface ApiErrorOptions {
  code?: string;
  details?: unknown;
  status: number;
}

export class ApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly status: number;

  constructor(message: string, {code, details, status}: ApiErrorOptions) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
}

export interface ApiClient {
  request<T>(
    path: string,
    schema: ZodType<T>,
    options?: ApiRequestOptions,
  ): Promise<T>;
}

export function createApiClient({
  baseUrl,
  fetchImplementation = fetch,
  timeoutMs = 10_000,
}: ApiClientOptions): ApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError("API timeout must be a positive finite number");
  }

  return {
    async request(path, schema, options = {}) {
      if (!path.startsWith("/") || path.startsWith("//")) {
        throw new TypeError(
          "Expected a relative API path beginning with a single slash",
        );
      }

      const {json, signal: callerSignal, ...requestOptions} = options;
      const headers = new Headers(requestOptions.headers);
      if (!headers.has("accept")) headers.set("accept", "application/json");
      if (json !== undefined && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }

      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signal = callerSignal
        ? AbortSignal.any([callerSignal, timeoutSignal])
        : timeoutSignal;
      const response = await fetchImplementation(`${normalizedBaseUrl}${path}`, {
        ...requestOptions,
        body: json === undefined ? undefined : JSON.stringify(json),
        credentials: requestOptions.credentials ?? "include",
        headers,
        signal,
      });

      if (!response.ok) {
        const payload: unknown = await readResponseBody(response);
        const body = isRecord(payload) ? payload : undefined;
        throw new ApiError(
          typeof body?.message === "string"
            ? body.message
            : `Request failed with status ${response.status}`,
          {
            code: typeof body?.code === "string" ? body.code : undefined,
            details: body?.details,
            status: response.status,
          },
        );
      }

      return schema.parse(await readResponseBody(response));
    },
  };
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
