import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

// 供给方主动下架自己的算力商品; 下架后可修改并重提(重新审核)。
export async function PATCH(_request: Request, {params}: {params: Promise<{productId: string}>}) {
  const {productId} = await params;
  return proxyAuthenticatedBackend(`/supplier/products/${encodeURIComponent(productId)}/offline`, {
    method: "PATCH",
  });
}
