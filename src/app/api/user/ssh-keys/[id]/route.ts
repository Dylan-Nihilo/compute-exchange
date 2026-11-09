import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

export async function DELETE(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  if (!/^[1-9]\d*$/.test(id)) return Response.json({code: 40001, message: "公钥编号无效"}, {status: 400});
  return proxyAuthenticatedBackend(`/user/ssh-keys/${id}`, {method: "DELETE", cache: "no-store"});
}
