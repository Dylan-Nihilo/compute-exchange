import {publicEnv, type PublicEnv} from "../config/public-env.ts";
import {createApiClient, type ApiClient} from "./client.ts";

export function createApiClientForEnvironment(
  environment: PublicEnv,
  fetchImplementation?: typeof fetch,
): ApiClient | null {
  if (!environment.NEXT_PUBLIC_API_BASE_URL) return null;

  // 浏览器一律走同源相对路径 /api/v1（开发由 next rewrite、生产由 Caddy 转发）。
  // 构建期注入的绝对地址只有单一主机名（不带 www），在 www.omnisline.com 的页面上
  // 发起 fetch 即构成跨域，后端不下发 CORS 头，下单页取商品会被浏览器直接拦截。
  // SSR/Server Component 没有同源概念，继续用绝对地址直连后端。
  if (typeof window !== "undefined") {
    return createApiClient({baseUrl: "/api/v1", fetchImplementation});
  }

  return createApiClient({
    baseUrl: environment.NEXT_PUBLIC_API_BASE_URL,
    fetchImplementation,
  });
}

export const apiClient = createApiClientForEnvironment(publicEnv);
