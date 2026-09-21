import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET(request: Request) {
  const {search} = new URL(request.url);
  return proxyAuthenticatedBackend(`/vendor/equipments${search}`, {cache: "no-store"});
}

export async function POST(request: Request) {
  return proxyAuthenticatedBackend("/vendor/equipments", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(await request.json()),
  });
}
