import {cookies} from "next/headers";
import {NextResponse} from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  authTokens,
  clearAuthCookies,
  getAuthBackend,
  postAuthBackend,
  REFRESH_TOKEN_COOKIE,
  REMEMBER_SESSION_COOKIE,
  setAuthCookies,
} from "@/lib/api/auth-backend";

export async function GET() {
  try {
    const cookieStore = await cookies();
    let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
    const persistent = cookieStore.get(REMEMBER_SESSION_COOKIE)?.value === "1";
    let refreshed: ReturnType<typeof authTokens> = null;

    if (!accessToken && !refreshToken) return signedOut();
    let result = accessToken
      ? await getAuthBackend("/auth/me", accessToken)
      : {payload: null, status: 401};

    if (result.status === 401 && refreshToken) {
      const refresh = await postAuthBackend("/auth/refresh", {
        refresh_token: refreshToken,
      });
      const rotatedTokens = authTokens(refresh.payload);
      if (refresh.status === 200 && rotatedTokens) {
        refreshed = rotatedTokens;
        accessToken = rotatedTokens.accessToken;
        result = await getAuthBackend("/auth/me", accessToken);
      }
    }

    const response = NextResponse.json(result.payload, {status: result.status});
    if (refreshed) {
      setAuthCookies(response, refreshed, persistent);
    } else if (result.status === 401) {
      clearAuthCookies(response);
    }
    return response;
  } catch {
    return NextResponse.json(
      {code: 50000, message: "认证服务暂不可用"},
      {status: 502},
    );
  }
}

function signedOut() {
  return NextResponse.json({code: 40100, message: "未登录"}, {status: 401});
}
