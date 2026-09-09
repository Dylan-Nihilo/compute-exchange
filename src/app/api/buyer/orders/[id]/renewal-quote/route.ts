import {NextResponse} from "next/server";
import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {isBuyerOrderNo} from "@/lib/buyer-orders";

export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const duration = new URL(request.url).searchParams.get("duration") ?? "";
  if (!isBuyerOrderNo(id) || !/^[1-9]\d*$/.test(duration) || !Number.isSafeInteger(Number(duration))) {
    return NextResponse.json({code: 40001, message: "续租参数无效"}, {status: 400});
  }
  return proxyAuthenticatedBackend(`/orders/${encodeURIComponent(id)}/renewal-quote?duration=${duration}`);
}
