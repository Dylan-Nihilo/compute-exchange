import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    product_id?: unknown;
    stock_after?: unknown;
    reason?: unknown;
  } | null;

  if (
    !body ||
    !Number.isInteger(body.product_id) ||
    (body.product_id as number) <= 0 ||
    !Number.isInteger(body.stock_after) ||
    (body.stock_after as number) < 0 ||
    typeof body.reason !== "string" ||
    !body.reason.trim()
  ) {
    return NextResponse.json({code: 40001, message: "盘点上报参数无效"}, {status: 400});
  }

  return proxyAuthenticatedBackend("/supplier/resource-syncs/passive", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      product_id: body.product_id,
      stock_after: body.stock_after,
      reason: body.reason.trim(),
    }),
  });
}
