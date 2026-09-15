import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET(request: Request) {
  const query = new URLSearchParams({order_no: new URL(request.url).searchParams.get("order_no") ?? ""});
  return proxyAuthenticatedBackend(`/supplier/schedule-advice?${query}`, {cache: "no-store"});
}
