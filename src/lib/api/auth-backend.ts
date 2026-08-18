import "server-only";

import {NextResponse} from "next/server";

import {publicEnv} from "../config/public-env";

export async function postAuthBackend(path: string, body: unknown) {
  const apiBaseUrl =
    process.env.AUTH_API_BASE_URL || publicEnv.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) throw new Error("Authentication API is not configured");

  const response = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return {payload: await response.json(), status: response.status};
}

export async function proxyAuthPost(request: Request, path: string) {
  try {
    const {payload, status} = await postAuthBackend(path, await request.json());
    return NextResponse.json(payload, {status});
  } catch {
    return NextResponse.json(
      {code: 50000, message: "认证服务暂不可用"},
      {status: 502},
    );
  }
}
