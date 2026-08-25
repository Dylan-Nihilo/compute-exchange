import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() {
  return proxyAuthenticatedBackend("/invoices/title", {cache: "no-store"});
}

export async function PUT(request: Request) {
  return proxyAuthenticatedBackend("/invoices/title", {
    method: "PUT",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(await request.json()),
  });
}
