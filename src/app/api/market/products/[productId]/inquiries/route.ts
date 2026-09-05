import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function POST(request: Request, {params}: {params: Promise<{productId: string}>}) {
  const {productId} = await params;
  return proxyAuthenticatedBackend(`/products/${encodeURIComponent(productId)}/inquiries`, {
    method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(await request.json()),
  });
}
