import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() {
  return proxyAuthenticatedBackend("/invoices/billable-orders", {cache: "no-store"});
}
