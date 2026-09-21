import {proxyAuthenticatedBackend} from "@/lib/api/auth-backend";

// 设备市场浏览需登录: 后端 GET /equipments 在 AuthRequired 组内, 经 BFF 换 Bearer 代理。
export function GET(request: Request) {
  const {search} = new URL(request.url);
  return proxyAuthenticatedBackend(`/equipments${search}`, {cache: "no-store"});
}
