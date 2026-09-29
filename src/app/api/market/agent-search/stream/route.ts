import {proxyAuthenticatedBackendRaw} from "@/lib/api/auth-backend";

export async function POST(request: Request) {
  const response = await proxyAuthenticatedBackendRaw("/market/agent-search/stream", {
    method: "POST", headers: {"content-type": "application/json", accept: "text/event-stream"},
    body: await request.text(), cache: "no-store", signal: request.signal,
  });
  response.headers.set("Cache-Control", "no-store, no-transform");
  response.headers.set("X-Accel-Buffering", "no");
  return response;
}
