import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

// 市场读接口鉴权代理: 后端 GET /products*、/trading-config、/gpu-catalog 已收口到登录后,
// 浏览器不再公开直连 /api/v1, 统一经此代理换 Bearer(401 自动 refresh)。
// 白名单限定可透传的路径, 防止演变成任意后端 GET 的开放代理。
const ALLOWED_PATHS = [
  /^products$/,
  /^products\/\d+$/,
  /^trading-config$/,
  /^gpu-catalog$/,
];

export async function GET(request: Request, {params}: {params: Promise<{path: string[]}>}) {
  const {path} = await params;
  const joined = path.join("/");
  if (!ALLOWED_PATHS.some((pattern) => pattern.test(joined))) {
    return Response.json({code: 40400, message: "not found"}, {status: 404});
  }
  const {search} = new URL(request.url);
  return proxyAuthenticatedBackend(`/${joined}${search}`, {cache: "no-store"});
}
