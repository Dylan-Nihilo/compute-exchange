import {NextResponse} from "next/server";

import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

// 中登网动产融资登记查询(人工录入库)。后端要求承租人名称/统一社会信用代码至少填一个。
export function GET(request: Request) {
  const source = new URL(request.url).searchParams;
  const lesseeName = source.get("lessee_name")?.trim() ?? "";
  const lesseeUscc = source.get("lessee_uscc")?.trim() ?? "";
  const page = source.get("page") ?? "1";

  if (!lesseeName && !lesseeUscc) {
    return NextResponse.json({code: 40001, message: "请至少填写承租人名称或统一社会信用代码"}, {status: 400});
  }
  if (lesseeName.length > 128 || (lesseeUscc && !/^[0-9A-Za-z]{8,18}$/.test(lesseeUscc)) || !/^[1-9]\d*$/.test(page)) {
    return NextResponse.json({code: 40001, message: "查询参数无效"}, {status: 400});
  }
  const params = new URLSearchParams({page, page_size: "20"});
  if (lesseeName) params.set("lessee_name", lesseeName);
  if (lesseeUscc) params.set("lessee_uscc", lesseeUscc);
  return proxyAuthenticatedBackend(`/collateral-registrations?${params}`, {cache: "no-store"});
}
