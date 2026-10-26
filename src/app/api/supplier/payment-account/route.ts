import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() {
  return proxyAuthenticatedBackend("/payment/supplier/onboard/status", {cache: "no-store"});
}

export function POST() {
  return proxyAuthenticatedBackend("/payment/supplier/onboard", {method: "POST", cache: "no-store"});
}
