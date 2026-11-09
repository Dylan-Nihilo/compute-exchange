import "server-only";

import {proxyAuthenticatedBackend} from "./auth-backend";

export type ProxyRule = {method: "GET" | "POST" | "PUT" | "DELETE"; pattern: RegExp};

/**
 * Proxies `${prefix}/${segments}` to the authenticated backend only when the method and
 * sub-path match an allowlist rule, so a catch-all BFF route never becomes an open proxy.
 * Query strings pass through for GET; bodies pass through as JSON for POST/PUT.
 */
export async function proxyAllowlisted(
  request: Request,
  prefix: string,
  segments: readonly string[],
  rules: readonly ProxyRule[],
) {
  const joined = segments.map((segment) => encodeURIComponent(segment)).join("/");
  const method = request.method.toUpperCase();
  if (!rules.some((rule) => rule.method === method && rule.pattern.test(joined))) {
    return Response.json({code: 40400, message: "not found"}, {status: 404});
  }
  const path = `${prefix}/${joined}`;
  if (method === "GET") {
    const {search} = new URL(request.url);
    return proxyAuthenticatedBackend(`${path}${search}`, {cache: "no-store"});
  }
  const body = await request.text();
  const response = await proxyAuthenticatedBackend(path, {
    method,
    cache: "no-store",
    ...(body ? {headers: {"content-type": "application/json"}, body} : {}),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
