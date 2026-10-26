import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function GET() {
  return proxyAuthenticatedBackend("/payment/channels", {cache: "no-store"});
}
