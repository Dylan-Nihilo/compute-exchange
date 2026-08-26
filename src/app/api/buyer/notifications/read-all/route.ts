import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function POST() {
  return proxyAuthenticatedBackend("/notifications/read-all", {method: "POST"});
}
