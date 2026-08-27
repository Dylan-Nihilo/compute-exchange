import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function POST(
  request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params;
  if (!/^[\w-]{1,32}$/.test(id)) {
    return NextResponse.json({code: 40001, message: "订单编号无效"}, {status: 400});
  }
  return proxyAuthenticatedBackend(`/orders/${id}/deliver`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(await request.json()),
  });
}
