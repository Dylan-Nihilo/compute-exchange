import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET(request: Request) {
  const {search} = new URL(request.url);
  return proxyAuthenticatedBackend(`/vendor/equipments/inquiries${search}`, {cache: "no-store"});
}
