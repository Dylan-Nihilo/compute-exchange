import type {Role} from "./contracts.ts";
import {
  accessFor,
  type AccessContext,
  type AccessLevel,
  type Capability,
} from "./permissions.ts";

export type RouteArea =
  | "portal"
  | "market"
  | "auth"
  | "onboarding"
  | "console"
  | "admin";

export interface RouteDefinition {
  href: string;
  label: string;
  area: RouteArea;
  roles: readonly Role[];
  capability?: Capability;
}

const publicRoles: readonly Role[] = [
  "guest",
  "buyer",
  "supplier",
  "vendor",
  "funder",
  "operator",
  "admin",
];

export const routes: readonly RouteDefinition[] = [
  {href: "/", label: "首页", area: "portal", roles: publicRoles, capability: "browse"},
  {href: "/compute", label: "算力服务", area: "portal", roles: publicRoles, capability: "browse"},
  {href: "/tokens", label: "Token 工厂", area: "portal", roles: publicRoles, capability: "browse"},
  {href: "/broker/equipment", label: "设备居间", area: "portal", roles: publicRoles, capability: "browse"},
  {href: "/broker/construction", label: "机电施工", area: "portal", roles: publicRoles, capability: "browse"},
  // 易宝支付入网合规(2026-09-21): 融资租赁入口整体下线(middleware 弹回首页), 恢复时取消注释。
  // {href: "/leasing", label: "融资租赁", area: "portal", roles: publicRoles, capability: "browse"},
  {href: "/attestations/verify", label: "存证验证", area: "portal", roles: publicRoles, capability: "browse"},
  {href: "/market", label: "算力市场", area: "market", roles: publicRoles, capability: "browse"},
  {href: "/equipment-market", label: "设备市场", area: "market", roles: publicRoles, capability: "browse"},
  {href: "/market/agent-search", label: "智能选型", area: "market", roles: ["buyer", "supplier", "vendor", "funder", "operator", "admin"]},
  {href: "/market/[productId]", label: "商品详情", area: "market", roles: publicRoles, capability: "browse"},
  {href: "/checkout", label: "确认订单", area: "market", roles: ["buyer"], capability: "orderCompute"},
  {href: "/market/[productId]/inquiry", label: "商品询价", area: "market", roles: ["buyer"], capability: "orderCompute"},
  {href: "/auth/login", label: "登录", area: "auth", roles: ["guest"], capability: "authenticate"},
  {href: "/auth/register", label: "注册", area: "auth", roles: ["guest"], capability: "authenticate"},
  {href: "/auth/verify", label: "个人/企业认证", area: "auth", roles: ["buyer", "supplier", "vendor", "funder"], capability: "kyc"},
  {href: "/supplier/apply", label: "成为供给方", area: "onboarding", roles: ["buyer"]},
  {href: "/console/consents", label: "授权同意记录", area: "console", roles: publicRoles.filter((role) => role !== "guest")},
  {href: "/console/buyer", label: "买家工作台", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/profile", label: "个人/企业中心", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/orders", label: "我的订单", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/orders/[orderId]", label: "订单详情", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/tokens", label: "我的 Token", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/billing", label: "账单与发票", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/invoices", label: "发票管理", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/tickets", label: "工单售后", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/tickets/[ticketNo]", label: "工单详情", area: "console", roles: ["buyer"]},
  {href: "/console/buyer/messages", label: "消息中心", area: "console", roles: ["buyer"]},
  {href: "/console/supplier", label: "供给方工作台", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/qualifications", label: "资质管理", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/products", label: "算力商品管理", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/products/new", label: "发布算力", area: "console", roles: ["supplier"], capability: "publishCompute"},
  {href: "/console/supplier/products/[productId]/edit", label: "修改算力商品", area: "console", roles: ["supplier"], capability: "publishCompute"},
  {href: "/console/supplier/centers", label: "成熟算力中心", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/centers/new", label: "发布算力中心", area: "console", roles: ["supplier"], capability: "publishCompute"},
  {href: "/console/supplier/colocation", label: "空心机房", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/colocation/new", label: "登记空心机房", area: "console", roles: ["supplier"], capability: "publishCompute"},
  {href: "/console/supplier/equipments", label: "设备商品管理", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/equipments/new", label: "发布设备商品", area: "console", roles: ["supplier"], capability: "publishEquipment"},
  {href: "/console/supplier/equipments/[equipmentId]/edit", label: "修改设备商品", area: "console", roles: ["supplier"], capability: "publishEquipment"},
  {href: "/console/supplier/nodes", label: "节点管理", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/inventory", label: "资源盘点", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/orders", label: "订单管理", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/settlements", label: "结算中心", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/analytics", label: "数据看板", area: "console", roles: ["supplier"]},
  {href: "/console/supplier/messages", label: "消息中心", area: "console", roles: ["supplier"]},
  // vendor(设备厂商)为历史设计遗留角色, 无入驻通道; 设备商品管理已归入供给方工作台,
  // 因此不再注册 /console/vendor/* 路由(Role 枚举保留以兼容 DB user_roles)。
  {href: "/console/funder", label: "资方工作台", area: "console", roles: ["funder"]},
  {href: "/console/funder/qualifications", label: "资方资质", area: "console", roles: ["funder"]},
  {href: "/console/funder/leads", label: "融资线索", area: "console", roles: ["funder"], capability: "viewFinanceLeads"},
  {href: "/admin", label: "运营工作台", area: "admin", roles: ["operator", "admin"]},
  {href: "/admin/reviews", label: "审核中心", area: "admin", roles: ["operator", "admin"], capability: "reviewQualification"},
  {href: "/admin/products", label: "商品管理", area: "admin", roles: ["operator", "admin"], capability: "manageProducts"},
  {href: "/admin/gpu-catalog", label: "GPU 型号库", area: "admin", roles: ["operator", "admin"], capability: "manageProducts"},
  {href: "/admin/orders", label: "订单管理", area: "admin", roles: ["operator", "admin"], capability: "interveneOrder"},
  {href: "/admin/finance", label: "资金与对账", area: "admin", roles: ["operator", "admin"], capability: "viewFinance"},
  {href: "/admin/crm", label: "CRM", area: "admin", roles: ["operator", "admin"], capability: "manageCrm"},
  {href: "/admin/risk", label: "风控工作台", area: "admin", roles: ["operator", "admin"], capability: "manageRisk"},
  {href: "/admin/tickets", label: "工单处理", area: "admin", roles: ["operator", "admin"], capability: "interveneOrder"},
  {href: "/admin/tokens", label: "Token 管理", area: "admin", roles: ["operator", "admin"], capability: "manageTokens"},
  {href: "/admin/cms", label: "内容管理", area: "admin", roles: ["operator", "admin"], capability: "manageCms"},
  {href: "/admin/users", label: "用户管理", area: "admin", roles: ["operator", "admin"], capability: "manageUsers"},
  {href: "/admin/access", label: "角色与权限", area: "admin", roles: ["admin"], capability: "manageAccess"},
  {href: "/admin/attestations", label: "存证管理", area: "admin", roles: ["operator", "admin"]},
  {href: "/admin/nodes", label: "节点与调度", area: "admin", roles: ["operator", "admin"]},
  {href: "/admin/audit", label: "审计日志", area: "admin", roles: ["operator", "admin"], capability: "viewAudit"},
  {href: "/admin/settings", label: "系统设置", area: "admin", roles: ["admin"], capability: "manageCompliance"},
];

export function matchRoute(pathname: string) {
  const pathSegments = normalizePath(pathname).split("/").filter(Boolean);

  return routes.find(({href}) => {
    const routeSegments = normalizePath(href).split("/").filter(Boolean);
    return (
      routeSegments.length === pathSegments.length &&
      routeSegments.every(
        (segment, index) =>
          (segment.startsWith("[") && segment.endsWith("]")) ||
          segment === pathSegments[index],
      )
    );
  });
}

export function homeForRole(role: Role) {
  if (role === "operator" || role === "admin") return "/admin";
  if (role === "guest") return "/";
  return `/console/${role}`;
}

export function canAccessRoute(pathname: string, context: AccessContext) {
  return accessLevelForRoute(pathname, context) === "allow";
}

export function accessLevelForRoute(
  pathname: string,
  context: AccessContext,
): AccessLevel {
  const route = matchRoute(pathname);
  if (!route || !route.roles.includes(context.role)) return "deny";
  if (!route.capability) return "allow";
  return accessFor(context, route.capability);
}

function normalizePath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") ?? "";
  return path || "/";
}
