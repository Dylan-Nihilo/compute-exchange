// 市场读接口鉴权代理白名单 (src/app/api/market-proxy/[...path]/route.ts)。
// 单独成模块以便测试; route 文件只允许导出路由处理函数。
export const MARKET_PROXY_PATHS: readonly RegExp[] = [
  /^products$/,
  /^products\/\d+$/,
  // v1.2 (compute-api.md): 余量与报价试算, 只计算不预留; 后端每用户每分钟 30 次(42900)。
  /^products\/\d+\/availability$/,
  // v1.2 包夜 (compute/handler.go:37 GET /products/:id/night-calendar): 逐晚同机可订最大卡数。
  // 与 availability 共用限流; managed 关闭时 40300, 包夜模块未接入 50000。
  /^products\/\d+\/night-calendar$/,
  /^trading-config$/,
  /^gpu-catalog$/,
  // v1.2 (docs/27 §27.8): 可一键部署的模型目录(active 条目)。
  /^models$/,
];

export function isMarketProxyPath(joined: string) {
  return MARKET_PROXY_PATHS.some((pattern) => pattern.test(joined));
}
