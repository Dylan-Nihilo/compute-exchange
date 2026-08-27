import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {buyerOrderStatuses} from "@/lib/buyer-orders";

export function GET(request: Request) {
  const source = new URL(request.url).searchParams;
  const status = source.get("status")?.trim() ?? "";
  const page = source.get("page") ?? "1";
  const pageSize = source.get("page_size") ?? "20";

  if (
    (status && !buyerOrderStatuses.some((value) => value === status)) ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(pageSize) ||
    Number(pageSize) > 100
  ) {
    return NextResponse.json({code: 40001, message: "订单筛选参数无效"}, {status: 400});
  }

  const params = new URLSearchParams({page, page_size: pageSize});
  if (status) params.set("status", status);
  return proxyAuthenticatedBackend(`/supplier/orders?${params}`, {cache: "no-store"});
}
