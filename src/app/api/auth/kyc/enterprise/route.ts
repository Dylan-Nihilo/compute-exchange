import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function POST(request: Request) {
  return proxyAuthenticatedBackend("/user/kyc/enterprise", {
    method: "POST",
    body: await request.formData(),
  });
}
