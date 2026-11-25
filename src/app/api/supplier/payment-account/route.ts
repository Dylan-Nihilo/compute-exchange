import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() {
  return proxyAuthenticatedBackend("/payment/supplier/onboard/status", {cache: "no-store"});
}

// 提交企业资料, 平台代向易宝进件为分账接收方。
export async function POST(request: Request) {
  return proxyAuthenticatedBackend("/payment/supplier/onboard", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(await request.json().catch(() => ({}))),
    cache: "no-store",
  });
}
