import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function PATCH(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return proxyAuthenticatedBackend(`/vendor/equipments/${encodeURIComponent(id)}/offline`, {
    method: "PATCH",
  });
}
