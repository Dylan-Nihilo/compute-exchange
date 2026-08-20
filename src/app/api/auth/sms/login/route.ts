import {authSessionResponse, postAuthBackend} from "@/lib/api/auth-backend";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const {payload, status} = await postAuthBackend("/auth/sms/login", {
      phone: body.phone,
      sms_code: body.sms_code,
    });
    return authSessionResponse(payload, status, body.remember === true);
  } catch {
    return Response.json(
      {code: 50000, message: "认证服务暂不可用"},
      {status: 502},
    );
  }
}
