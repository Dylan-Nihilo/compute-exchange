import {dirname} from "node:path";
import {fileURLToPath} from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/compute-spot/:asset(hero-motion-.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  turbopack: {
    root,
  },
  async rewrites() {
    // 本地联调拓扑与生产一致: 浏览器始终走同源 /api/v1。
    // 生产由 Caddy 把该路径转给后端容器, 本地由 Next 转发到 BACKEND_ORIGIN。
    const backendOrigin = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:8080";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
