import "server-only";

import {cookies} from "next/headers";
import {NextResponse} from "next/server";

import {publicEnv} from "../config/public-env";

export const ACCESS_TOKEN_COOKIE = "omnis_access_token";
export const REFRESH_TOKEN_COOKIE = "omnis_refresh_token";
export const REMEMBER_SESSION_COOKIE = "omnis_remember_session";

export async function postAuthBackend(
  path: string,
  body: unknown,
  headers?: HeadersInit,
) {
  return requestAuthBackend(path, {
    method: "POST",
    headers: {"content-type": "application/json", ...headers},
    body: JSON.stringify(body),
  });
}

export async function proxyAuthenticatedBackend(
  path: string,
  init: RequestInit = {},
) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    return NextResponse.json({code: 40001, message: "请求路径无效"}, {status: 400});
  }

  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    const persistent = cookieStore.get(REMEMBER_SESSION_COOKIE)?.value === "1";
    let refreshed: ReturnType<typeof authTokens> = null;

    if (!accessToken && !refreshToken) return signedOut();

    let result = accessToken
      ? await requestAuthBackend(path, authorized(init, accessToken))
      : {payload: null, status: 401};

    if (result.status === 401 && refreshToken) {
      const refresh = await postAuthBackend("/auth/refresh", {
        refresh_token: refreshToken,
      });
      const rotatedTokens = authTokens(refresh.payload);
      if (refresh.status === 200 && rotatedTokens) {
        refreshed = rotatedTokens;
        accessToken = rotatedTokens.accessToken;
        result = await requestAuthBackend(path, authorized(init, accessToken));
      }
    }

    const response = NextResponse.json(result.payload, {status: result.status});
    if (refreshed) setAuthCookies(response, refreshed, persistent);
    else if (result.status === 401) clearAuthCookies(response);
    return response;
  } catch {
    return NextResponse.json(
      {code: 50000, message: "服务暂不可用"},
      {status: 502},
    );
  }
}

export async function requestAuthBackend(path: string, init: RequestInit) {
  const apiBaseUrl =
    process.env.AUTH_API_BASE_URL || publicEnv.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) throw new Error("Authentication API is not configured");

  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    cache: "no-store",
  });
  return {payload: await response.json(), status: response.status};
}

// proxyAuthenticatedBackendRaw 与 proxyAuthenticatedBackend 走同一套
// cookie 鉴权 + refresh 逻辑, 但透传二进制响应(发票 PDF 下载):
// 上游为 JSON 时按错误 envelope 透传, 否则流式转发 body 与下载相关响应头。
export async function proxyAuthenticatedBackendRaw(
  path: string,
  init: RequestInit = {},
) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) {
    return NextResponse.json({code: 40001, message: "请求路径无效"}, {status: 400});
  }

  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    const persistent = cookieStore.get(REMEMBER_SESSION_COOKIE)?.value === "1";
    let refreshed: ReturnType<typeof authTokens> = null;

    if (!accessToken && !refreshToken) return signedOut();

    const apiBaseUrl =
      process.env.AUTH_API_BASE_URL || publicEnv.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) throw new Error("Authentication API is not configured");
    const url = `${apiBaseUrl.replace(/\/+$/, "")}${path}`;

    let upstream = accessToken
      ? await fetch(url, {...authorized(init, accessToken), cache: "no-store"})
      : null;

    if ((!upstream || upstream.status === 401) && refreshToken) {
      const refresh = await postAuthBackend("/auth/refresh", {
        refresh_token: refreshToken,
      });
      const rotatedTokens = authTokens(refresh.payload);
      if (refresh.status === 200 && rotatedTokens) {
        refreshed = rotatedTokens;
        accessToken = rotatedTokens.accessToken;
        upstream = await fetch(url, {...authorized(init, accessToken), cache: "no-store"});
      }
    }

    if (!upstream) return signedOut();

    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = await upstream.json().catch(() => null);
      const response = NextResponse.json(
        payload ?? {code: 50000, message: "服务暂不可用"},
        {status: upstream.status},
      );
      if (refreshed) setAuthCookies(response, refreshed, persistent);
      else if (upstream.status === 401) clearAuthCookies(response);
      return response;
    }

    const headers = new Headers({"content-type": contentType});
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) headers.set("content-disposition", disposition);
    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
    if (refreshed) setAuthCookies(response, refreshed, persistent);
    return response;
  } catch {
    return NextResponse.json(
      {code: 50000, message: "服务暂不可用"},
      {status: 502},
    );
  }
}

export function authSessionResponse(
  payload: unknown,
  status: number,
  persistent: boolean,
) {
  if (!isRecord(payload) || payload.code !== 0 || !isRecord(payload.data)) {
    return NextResponse.json(payload, {status});
  }
  const tokens = authTokens(payload);
  if (!tokens) {
    return NextResponse.json(
      {code: 50000, message: "认证服务返回格式错误"},
      {status: 502},
    );
  }

  const response = NextResponse.json({
    ...payload,
    data: {user: payload.data.user},
  });
  setAuthCookies(response, tokens, persistent);
  return response;
}

export function authTokens(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.data)) return null;
  const {access_token, expires_in, refresh_token} = payload.data;
  if (
    typeof access_token !== "string" ||
    typeof refresh_token !== "string" ||
    typeof expires_in !== "number"
  ) {
    return null;
  }
  return {accessToken: access_token, refreshToken: refresh_token, expiresIn: expires_in};
}

export function setAuthCookies(
  response: NextResponse,
  tokens: {accessToken: string; refreshToken: string; expiresIn: number},
  persistent: boolean,
) {
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...options,
    maxAge: persistent ? tokens.expiresIn : undefined,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...options,
    maxAge: persistent ? 7 * 24 * 60 * 60 : undefined,
  });
  response.cookies.set(REMEMBER_SESSION_COOKIE, persistent ? "1" : "0", {
    ...options,
    maxAge: persistent ? 7 * 24 * 60 * 60 : undefined,
  });
}

export function clearAuthCookies(response: NextResponse) {
  for (const name of [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    REMEMBER_SESSION_COOKIE,
  ]) {
    response.cookies.set(name, "", {httpOnly: true, path: "/", maxAge: 0});
  }
}

export async function proxyAuthPost(request: Request, path: string) {
  try {
    const clientIp = request.headers.get("x-forwarded-for");
    const {payload, status} = await postAuthBackend(
      path,
      await request.json(),
      clientIp ? {"x-forwarded-for": clientIp} : undefined,
    );
    return NextResponse.json(payload, {status});
  } catch {
    return NextResponse.json(
      {code: 50000, message: "认证服务暂不可用"},
      {status: 502},
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function authorized(init: RequestInit, accessToken: string): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  return {...init, headers};
}

function signedOut() {
  return NextResponse.json({code: 40100, message: "未登录"}, {status: 401});
}
