import {proxyAllowlisted} from "@/lib/api/allowlist-proxy";
import {BUYER_ORDER_ACTION_RULES} from "@/lib/api/buyer-order-proxy-rules";
import {isBuyerOrderNo} from "@/lib/buyer-orders";

// Existing static siblings (confirm, cancel, refund, renew, renewal-quote, access-credential)
// keep their own route files and take precedence over this catch-all. Rules: lib/api/buyer-order-proxy-rules.ts.

type Context = {params: Promise<{id: string; action: string[]}>};

async function handle(request: Request, {params}: Context) {
  const {id, action} = await params;
  if (!isBuyerOrderNo(id)) return Response.json({code: 40001, message: "订单编号无效"}, {status: 400});
  return proxyAllowlisted(request, `/orders/${encodeURIComponent(id)}`, action, BUYER_ORDER_ACTION_RULES);
}

export {handle as GET, handle as POST, handle as PUT};
