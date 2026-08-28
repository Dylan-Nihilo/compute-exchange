import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET(request: Request) {
  const source = new URL(request.url).searchParams;
  const productId = source.get("product_id")?.trim() ?? "";
  const page = source.get("page") ?? "1";
  const pageSize = source.get("page_size") ?? "20";

  if (
    (productId && !/^[1-9]\d*$/.test(productId)) ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(pageSize) ||
    Number(pageSize) > 100
  ) {
    return NextResponse.json({code: 40001, message: "盘点筛选参数无效"}, {status: 400});
  }

  const params = new URLSearchParams({page, page_size: pageSize});
  if (productId) params.set("product_id", productId);
  return proxyAuthenticatedBackend(`/supplier/resource-syncs?${params}`, {cache: "no-store"});
}
