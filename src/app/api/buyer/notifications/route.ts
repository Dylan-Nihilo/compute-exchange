import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";
import {notificationTypes} from "@/lib/buyer-notifications";

export function GET(request: Request) {
  const source = new URL(request.url).searchParams;
  const type = source.get("type")?.trim() ?? "";
  const page = source.get("page") ?? "1";
  const pageSize = source.get("page_size") ?? "20";

  if (
    (type && !notificationTypes.some((value) => value === type)) ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(pageSize) ||
    Number(pageSize) > 100
  ) {
    return NextResponse.json({code: 40001, message: "消息筛选参数无效"}, {status: 400});
  }

  const params = new URLSearchParams({page, page_size: pageSize});
  if (type) params.set("type", type);
  return proxyAuthenticatedBackend(`/notifications?${params}`, {cache: "no-store"});
}
