import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {isBuyerOrderNo} from "@/lib/buyer-orders";

export async function POST(
  _request: Request,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params;
  if (!isBuyerOrderNo(id)) {
    return NextResponse.json({code: 40001, message: "订单编号无效"}, {status: 400});
  }
  return proxyAuthenticatedBackend(`/orders/${encodeURIComponent(id)}/confirm`, {method: "POST"});
}
