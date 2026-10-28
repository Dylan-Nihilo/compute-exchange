import {proxyAllowlisted, type ProxyRule} from "@/lib/api/allowlist-proxy";

// v1.2 managed node onboarding (docs/25 §25.10, supplier group).
const RULES: ProxyRule[] = [
  {method: "GET", pattern: /^onboarding$/},
  {method: "GET", pattern: /^probe-reports$/},
  {method: "GET", pattern: /^slots$/},
  {method: "PUT", pattern: /^ssh$/},
  {method: "PUT", pattern: /^slots\/\d+$/},
  {method: "POST", pattern: /^verify$/},
  {method: "POST", pattern: /^host-key\/confirm$/},
  {method: "POST", pattern: /^drain$/},
  {method: "POST", pattern: /^undrain$/},
  {method: "POST", pattern: /^reimage-confirm$/},
];

type Context = {params: Promise<{nodeId: string; action: string[]}>};

async function handle(request: Request, {params}: Context) {
  const {nodeId, action} = await params;
  if (!/^[1-9]\d*$/.test(nodeId)) return Response.json({code: 40001, message: "节点编号无效"}, {status: 400});
  return proxyAllowlisted(request, `/supplier/nodes/${nodeId}`, action, RULES);
}

export {handle as GET, handle as POST, handle as PUT};
