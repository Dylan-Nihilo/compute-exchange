import {NextResponse} from "next/server";

import {postAuthBackend} from "@/lib/api/auth-backend";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const {payload, status} = await postAuthBackend("/auth/sms/login", {
      phone: body.phone,
      sms_code: body.sms_code,
    });
    if (!isRecord(payload) || payload.code !== 0 || !isRecord(payload.data)) {
      return NextResponse.json(payload, {status});
    }

    const {access_token, expires_in, refresh_token, user} = payload.data;
    if (
      typeof access_token !== "string" ||
      typeof refresh_token !== "string" ||
      typeof expires_in !== "number"
    ) {
      return NextResponse.json(
        {code: 50000, message: "认证服务返回格式错误"},
        {status: 502},
      );
    }

    const response = NextResponse.json({
      ...payload,
      data: {user},
    });
    const persistent = body.remember === true;
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    };
    response.cookies.set("omnis_access_token", access_token, {
      ...cookieOptions,
      maxAge: persistent ? expires_in : undefined,
    });
    response.cookies.set("omnis_refresh_token", refresh_token, {
      ...cookieOptions,
      maxAge: persistent ? 7 * 24 * 60 * 60 : undefined,
    });
    return response;
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
