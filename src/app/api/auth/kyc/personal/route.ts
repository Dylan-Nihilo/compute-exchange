import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function POST(request: Request) {
  return proxyAuthenticatedBackend("/user/kyc/personal", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(await request.json()),
  });
}
