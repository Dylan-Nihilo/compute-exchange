import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function PUT(request: Request, {params}: {params: Promise<{productId: string}>}) {
  const {productId} = await params;
  return proxyAuthenticatedBackend(`/supplier/products/${encodeURIComponent(productId)}`, {
    method: "PUT", headers: {"content-type": "application/json"}, body: JSON.stringify(await request.json()),
  });
}
