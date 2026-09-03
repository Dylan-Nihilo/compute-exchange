import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

type Context = {params: Promise<{path: string[]}>};

async function proxy(request: Request, {params}: Context) {
  const {path} = await params;
  const upstreamPath = `/admin/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;
  const contentType = request.headers.get("content-type");
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return proxyAuthenticatedBackend(upstreamPath, {
    method: request.method,
    headers: contentType ? {"content-type": contentType} : undefined,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });
}

export const GET = proxy;
export const PATCH = proxy;
export const POST = proxy;
export const PUT = proxy;
