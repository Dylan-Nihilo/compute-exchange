import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() {
  return proxyAuthenticatedBackend("/orders?page=1&page_size=100");
}
