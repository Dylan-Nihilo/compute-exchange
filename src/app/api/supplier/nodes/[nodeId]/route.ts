import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function DELETE(_request: Request, {params}: {params: Promise<{nodeId: string}>}) {
  const {nodeId} = await params;
  return proxyAuthenticatedBackend(`/supplier/nodes/${encodeURIComponent(nodeId)}`, {method: "DELETE", cache: "no-store"});
}
