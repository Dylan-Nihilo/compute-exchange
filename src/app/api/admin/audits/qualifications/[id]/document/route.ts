import {proxyAuthenticatedBackendRaw} from "@/lib/api/auth-backend";

type Context = {params: Promise<{id: string}>};

export async function GET(_request: Request, {params}: Context) {
  const {id} = await params;
  return proxyAuthenticatedBackendRaw(`/admin/audits/qualifications/${encodeURIComponent(id)}/document`);
}
