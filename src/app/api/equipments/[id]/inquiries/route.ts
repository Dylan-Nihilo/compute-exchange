import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function POST(request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return proxyAuthenticatedBackend(`/equipments/${encodeURIComponent(id)}/inquiries`, {
    method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(await request.json()),
  });
}
