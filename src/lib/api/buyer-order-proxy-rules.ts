// Allow-list of the buyer order catch-all BFF route (src/app/api/buyer/orders/[id]/[...action]/route.ts).
// v1.2 managed rental (docs/25 §25.10 buyer), nightly (GET nights, integ f57d20a) and one-click deploy (docs/27 §27.8).
// Outages / outage-remedy / nights / deployments are only registered when fleet.enabled=true; otherwise the
// backend 404 surfaces as-is.

export type BuyerOrderProxyRule = {method: "GET" | "POST" | "PUT" | "DELETE"; pattern: RegExp};

const DEPLOY_NO = "[A-Za-z0-9-]{4,40}";

export const BUYER_ORDER_ACTION_RULES: readonly BuyerOrderProxyRule[] = [
  {method: "GET", pattern: /^access$/},
  {method: "GET", pattern: /^sessions$/},
  {method: "GET", pattern: /^outages$/},
  {method: "PUT", pattern: /^outage-remedy$/},
  {method: "GET", pattern: /^nights$/},
  {method: "GET", pattern: /^deploy-plans$/},
  {method: "GET", pattern: /^deployments$/},
  {method: "POST", pattern: /^deployments$/},
  {method: "GET", pattern: new RegExp(`^deployments/${DEPLOY_NO}$`)},
  {method: "GET", pattern: new RegExp(`^deployments/${DEPLOY_NO}/(health|logs)$`)},
  {method: "POST", pattern: new RegExp(`^deployments/${DEPLOY_NO}/(stop|restart)$`)},
];

export function isBuyerOrderActionAllowed(method: string, joined: string) {
  const upper = method.toUpperCase();
  return BUYER_ORDER_ACTION_RULES.some((rule) => rule.method === upper && rule.pattern.test(joined));
}
