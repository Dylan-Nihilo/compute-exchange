import {NextResponse} from "next/server";
import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {isBuyerOrderNo} from "@/lib/buyer-orders";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const body: unknown = await request.json().catch(() => null);
  if (!isBuyerOrderNo(id) || !body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({code: 40001, message: "续租参数无效"}, {status: 400});
  }
  return proxyAuthenticatedBackend(`/orders/${encodeURIComponent(id)}/renew`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
}
