import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() {
  return proxyAuthenticatedBackend("/supplier-applications", {method: "GET", cache: "no-store"});
}

export async function POST(request: Request) {
  return proxyAuthenticatedBackend("/supplier-applications", {
    method: "POST",
    body: await request.formData(),
  });
}
