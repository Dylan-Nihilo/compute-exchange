import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() {
  return proxyAuthenticatedBackend("/supplier/settlements/summary", {cache: "no-store"});
}
