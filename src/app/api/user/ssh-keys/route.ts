import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

// v1.2 buyer SSH public keys (docs/25 §25.10). Format/strength is validated by the backend.
export function GET() {
  return proxyAuthenticatedBackend("/user/ssh-keys", {cache: "no-store"});
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyAuthenticatedBackend("/user/ssh-keys", {
    method: "POST",
    cache: "no-store",
    headers: {"content-type": "application/json"},
    body,
  });
}
