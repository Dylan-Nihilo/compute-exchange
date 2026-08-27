import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export function GET() {
  return proxyAuthenticatedBackend("/supplier/products", {cache: "no-store"});
}

export async function POST(request: Request) {
  return proxyAuthenticatedBackend("/supplier/products", {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(await request.json()),
  });
}
