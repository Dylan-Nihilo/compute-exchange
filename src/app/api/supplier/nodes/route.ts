import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() { return proxyAuthenticatedBackend("/supplier/nodes", {cache: "no-store"}); }

export async function POST(request: Request) {
  const response = await proxyAuthenticatedBackend("/supplier/nodes", {method: "POST", headers: {"content-type": "application/json"}, body: await request.text(), cache: "no-store"});
  response.headers.set("Cache-Control", "no-store");
  return response;
}
