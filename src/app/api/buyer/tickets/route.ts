import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {ticketStatuses} from "@/lib/buyer-tickets";

export function GET(request: Request) {
  const source = new URL(request.url).searchParams;
  const status = source.get("status")?.trim() ?? "";
  const keyword = source.get("keyword")?.trim() ?? "";
  const page = source.get("page") ?? "1";
  const pageSize = source.get("page_size") ?? "20";

  if (
    (status && !ticketStatuses.some((value) => value === status)) ||
    keyword.length > 64 ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(pageSize) ||
    Number(pageSize) > 100
  ) {
    return NextResponse.json({code: 40001, message: "工单筛选参数无效"}, {status: 400});
  }

  const params = new URLSearchParams({page, page_size: pageSize});
  if (status) params.set("status", status);
  if (keyword) params.set("keyword", keyword);
  return proxyAuthenticatedBackend(`/tickets?${params}`, {cache: "no-store"});
}

export async function POST(request: Request) {
  return proxyAuthenticatedBackend("/tickets", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(await request.json()),
  });
}
