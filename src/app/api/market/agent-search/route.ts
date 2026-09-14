import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function POST(request: Request) {
  const response = await proxyAuthenticatedBackend("/market/agent-search", {method: "POST", headers: {"content-type": "application/json"}, body: await request.text(), cache: "no-store", signal: request.signal});
  response.headers.set("Cache-Control", "no-store");
  return response;
}
