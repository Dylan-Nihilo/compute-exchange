import {proxyAllowlisted, type ProxyRule} from "@/lib/api/allowlist-proxy";
import {isBuyerOrderNo} from "@/lib/buyer-orders";

// v1.2 managed rental (docs/25 §25.10 buyer) and one-click deploy (docs/27 §27.8 buyer).
// Existing static siblings (confirm, cancel, refund, renew, renewal-quote, access-credential)
// keep their own route files and take precedence over this catch-all.
// Outages / outage-remedy (T-105, fleet/handler.go RegisterBuyerRoutes) and the deployment routes
// (T-098/T-099) are only registered when fleet.enabled=true; otherwise the backend 404 surfaces as-is.
const DEPLOY_NO = "[A-Za-z0-9-]{4,40}";
const RULES: ProxyRule[] = [
  {method: "GET", pattern: /^access$/},
  {method: "GET", pattern: /^sessions$/},
  {method: "GET", pattern: /^outages$/},
  {method: "PUT", pattern: /^outage-remedy$/},
  {method: "GET", pattern: /^deploy-plans$/},
  {method: "GET", pattern: /^deployments$/},
  {method: "POST", pattern: /^deployments$/},
  {method: "GET", pattern: new RegExp(`^deployments/${DEPLOY_NO}$`)},
  {method: "GET", pattern: new RegExp(`^deployments/${DEPLOY_NO}/(health|logs)$`)},
  {method: "POST", pattern: new RegExp(`^deployments/${DEPLOY_NO}/(stop|restart)$`)},
];

type Context = {params: Promise<{id: string; action: string[]}>};

async function handle(request: Request, {params}: Context) {
  const {id, action} = await params;
  if (!isBuyerOrderNo(id)) return Response.json({code: 40001, message: "订单编号无效"}, {status: 400});
  return proxyAllowlisted(request, `/orders/${encodeURIComponent(id)}`, action, RULES);
}

export {handle as GET, handle as POST, handle as PUT};
