import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {isBuyerOrderNo} from "@/lib/buyer-orders";

type Context = {params: Promise<{orderNo: string}>};

export async function GET(_request: Request, {params}: Context) {
  const {orderNo} = await params;
  if (!isBuyerOrderNo(orderNo)) {
    return NextResponse.json({code: 40001, message: "订单号无效"}, {status: 400});
  }
  return proxyAuthenticatedBackend(`/payment/status/${orderNo}`, {cache: "no-store"});
}
