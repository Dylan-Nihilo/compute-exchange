import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

// 供应方修改重提: 仅 draft(草稿/被驳回)可改, 重提后回 pending 重新审核。
export async function PUT(request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return proxyAuthenticatedBackend(`/vendor/equipments/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(await request.json()),
  });
}
