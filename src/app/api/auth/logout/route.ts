import {cookies} from "next/headers";
import {NextResponse} from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  clearAuthCookies,
  postAuthBackend,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/api/auth-backend";

export async function POST() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  let payload: unknown = {code: 0, message: "success", data: null};
  let status = 200;
  try {
    if (accessToken || refreshToken) {
      const result = await postAuthBackend(
        "/auth/logout",
        {refresh_token: refreshToken},
        accessToken ? {authorization: `Bearer ${accessToken}`} : undefined,
      );
      payload = result.payload;
      status = result.status;
    }
  } catch {
    status = 502;
    payload = {code: 50000, message: "认证服务暂不可用"};
  }
  const response = NextResponse.json(payload, {status});
  clearAuthCookies(response);
  return response;
}
