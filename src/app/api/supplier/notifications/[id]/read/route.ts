import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function POST(
  _request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params;
  if (!/^[1-9]\d*$/.test(id)) {
    return NextResponse.json({code: 40001, message: "消息编号无效"}, {status: 400});
  }
  return proxyAuthenticatedBackend(`/notifications/${id}/read`, {method: "POST"});
}
