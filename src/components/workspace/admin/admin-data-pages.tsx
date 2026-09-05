"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Check, CircleOff, ShieldBan} from "lucide";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {
  assignAdminLead,
  fetchAdminAuditLogs,
  fetchAdminInvoices,
  fetchAdminLeads,
  fetchAdminOrders,
  fetchAdminPayments,
  fetchAdminProducts,
  fetchAdminRiskAlerts,
  fetchAdminTickets,
  fetchAdminUsers,
  freezeAdminUser,
  offlineProduct,
  resolveRiskAlert,
  updateAdminOrderStatus,
  updateAdminTicket,
} from "@/lib/admin-workspace";
import {useCurrentAccount} from "@/lib/auth/queries";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";
import {pricingModeCopy, productTypeCopy} from "@/lib/supplier-workspace";

import {
  AdminPage,
  AdminPanel,
  AdminTableHead,
  AdminTableShell,
  StatusBadge,
  adminTableClass,
} from "./admin-ui";

const money = new Intl.NumberFormat("zh-CN", {currency: "CNY", style: "currency"});

export function AdminProducts() {
  const client = useQueryClient();
  const query = useQuery({queryKey: ["admin", "products"], queryFn: () => fetchAdminProducts({pageSize: 100})});
  const mutation = useMutation({
    mutationFn: (id: number) => offlineProduct(id),
    onSuccess: async () => { await client.invalidateQueries({queryKey: ["admin", "products"]}); notify.success("商品已下架"); },
    onError: (error) => notify.error(messageFor(error)),
  });
  return (
    <AdminPage title="商品管理" eyebrow="Catalog" description="查看平台商品状态，并对在售商品执行下架。">
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell {...tableState(query, "暂无商品", "供给方发布的商品会显示在这里。") }>
          {query.data?.items.length ? <table className={adminTableClass}>
            <caption className="sr-only">平台商品列表</caption>
            <AdminTableHead><th scope="col">商品</th><th scope="col">供给方</th><th scope="col">类型</th><th scope="col">规格</th><th scope="col">价格</th><th scope="col">状态</th><th className="text-right" scope="col">操作</th></AdminTableHead>
            <tbody>{query.data.items.map((item) => <tr key={item.id}>
              <th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.gpu_model || `资源 #${item.id}`}</th>
              <td>UID-{item.supplier_id}</td><td>{productTypeCopy[item.product_type] ?? item.product_type}</td>
              <td>{item.card_count ? `${item.card_count} 卡` : `${item.rack_count ?? 0} 机柜`}</td>
              <td>{item.price_negotiable ? "面议" : `${money.format(item.unit_price / 100)} / ${pricingModeCopy[item.pricing_mode] ?? item.pricing_mode}`}</td>
              <td><StatusBadge status={item.status} /></td>
              <td className="text-right">{item.status === "active" ? <Button isPending={mutation.isPending} size="sm" variant="tertiary" onPress={() => mutation.mutate(item.id)}><InteractiveIcon icon={CircleOff} size={14} />下架</Button> : "—"}</td>
            </tr>)}</tbody>
          </table> : null}
        </AdminTableShell>
      </AdminPanel>
    </AdminPage>
  );
}

export function AdminOrders() {
  const client = useQueryClient();
  const query = useQuery({queryKey: ["admin", "orders"], queryFn: () => fetchAdminOrders({pageSize: 100})});
  const mutation = useMutation({
    mutationFn: ({id, status}: {id: number; status: string}) => updateAdminOrderStatus(id, status),
    onSuccess: async () => { await client.invalidateQueries({queryKey: ["admin", "orders"]}); notify.success("订单状态已更新"); },
    onError: (error) => notify.error(messageFor(error)),
  });
  return (
    <AdminPage title="订单管理" eyebrow="Orders" description="跟踪交易履约，必要时介入异常订单。">
      <AdminPanel className="overflow-hidden p-3 sm:p-4"><AdminTableShell {...tableState(query, "暂无订单", "买家下单后会显示在这里。") }>
        {query.data?.items.length ? <table className={adminTableClass}><caption className="sr-only">平台订单列表</caption>
          <AdminTableHead><th scope="col">订单号</th><th scope="col">买家</th><th scope="col">商品</th><th scope="col">金额</th><th scope="col">创建时间</th><th scope="col">状态</th><th className="text-right" scope="col">操作</th></AdminTableHead>
          <tbody>{query.data.items.map((item) => <tr key={item.id}><th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.order_no}</th><td>UID-{item.buyer_id}</td><td>#{item.product_id} · {item.quantity} × {item.duration}</td><td>{money.format(item.total_amount / 100)}</td><td>{formatDateTime(item.created_at)}</td><td><StatusBadge status={item.status} /></td><td className="text-right">{!["completed", "cancelled", "refunded"].includes(item.status) ? <Button isPending={mutation.isPending} size="sm" variant="tertiary" onPress={() => mutation.mutate({id: item.id, status: "cancelled"})}>关闭订单</Button> : "—"}</td></tr>)}</tbody>
        </table> : null}
      </AdminTableShell></AdminPanel>
    </AdminPage>
  );
}

export function AdminFinance() {
  const invoices = useQuery({queryKey: ["admin", "invoices"], queryFn: () => fetchAdminInvoices({pageSize: 100})});
  const payments = useQuery({queryKey: ["admin", "payments"], queryFn: () => fetchAdminPayments()});
  return (
    <AdminPage title="资金与对账" eyebrow="Finance" description="核对开票状态与支付流水。">
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminPanel className="px-5 py-4"><p className="text-xs text-[#78909c]">发票申请</p><p className="mt-2 text-2xl font-semibold text-[#173447]">{invoices.data?.total ?? "—"}</p></AdminPanel>
        <AdminPanel className="px-5 py-4"><p className="text-xs text-[#78909c]">支付流水</p><p className="mt-2 text-2xl font-semibold text-[#173447]">{payments.data?.length ?? "—"}</p></AdminPanel>
      </div>
      <AdminPanel className="overflow-hidden p-3 sm:p-4"><AdminTableShell {...tableState(invoices, "暂无发票记录", "开票申请会显示在这里。") }>
        {invoices.data?.items.length ? <table className={adminTableClass}><caption className="sr-only">发票记录</caption><AdminTableHead><th scope="col">申请单</th><th scope="col">买家</th><th scope="col">抬头</th><th scope="col">金额</th><th scope="col">状态</th><th scope="col">申请时间</th></AdminTableHead><tbody>{invoices.data.items.map((item) => <tr key={item.id}><th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.invoice_no}</th><td>UID-{item.buyer_id}</td><td>{item.company_name}</td><td>{money.format(item.amount_fen / 100)}</td><td><StatusBadge status={item.status} /></td><td>{formatDateTime(item.applied_at)}</td></tr>)}</tbody></table> : null}
      </AdminTableShell></AdminPanel>
    </AdminPage>
  );
}

export function AdminCrm() {
  const client = useQueryClient();
  const account = useCurrentAccount().data;
  const query = useQuery({queryKey: ["admin", "leads"], queryFn: () => fetchAdminLeads({pageSize: 100})});
  const mutation = useMutation({
    mutationFn: (id: number) => assignAdminLead(id, Number(account?.id)),
    onSuccess: async () => { await client.invalidateQueries({queryKey: ["admin", "leads"]}); notify.success("线索已由你跟进"); },
    onError: (error) => notify.error(messageFor(error)),
  });
  return (
    <AdminPage title="CRM 线索" eyebrow="CRM" description="跟进算力询价、设备居间与融资租赁需求。">
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell {...tableState(query, "暂无业务线索", "客户提交需求后会显示在这里。") }>
          {query.data?.items.length ? <table className={adminTableClass}>
            <caption className="sr-only">CRM 线索</caption>
            <AdminTableHead><th scope="col">联系人</th><th scope="col">类型</th><th scope="col">联系方式</th><th scope="col">需求</th><th scope="col">预算</th><th scope="col">状态</th><th scope="col">负责人</th><th scope="col">提交时间</th><th scope="col">操作</th></AdminTableHead>
            <tbody>{query.data.items.map((item) => <tr key={item.id}>
              <th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.contact_name}</th>
              <td>{({compute: "算力询价", finance_lease: "融资租赁", equipment: "设备居间", construction: "机房建设"} as Record<string, string>)[item.type] ?? item.type}</td>
              <td>{item.contact_phone || item.contact_email}</td><td className="max-w-72 whitespace-pre-wrap break-words">{item.description}</td><td>{item.amount_range || "—"}</td>
              <td><StatusBadge status={item.status} /></td><td>{item.assignee_id ? String(item.assignee_id) === account?.id ? "我" : `UID-${item.assignee_id}` : "待分配"}</td><td>{formatDateTime(item.created_at)}</td>
              <td>{item.status === "new" && !item.assignee_id ? <Button size="sm" variant="tertiary" isDisabled={!account} isPending={mutation.isPending} onPress={() => mutation.mutate(item.id)}>由我跟进</Button> : "—"}</td>
            </tr>)}</tbody>
          </table> : null}
        </AdminTableShell>
      </AdminPanel>
    </AdminPage>
  );
}

export function AdminRisk() {
  const client = useQueryClient();
  const query = useQuery({queryKey: ["admin", "risk"], queryFn: () => fetchAdminRiskAlerts({pageSize: 100})});
  const mutation = useMutation({mutationFn: ({id, decision}: {id: number; decision: "freeze" | "dismiss"}) => resolveRiskAlert(id, decision), onSuccess: async () => { await client.invalidateQueries({queryKey: ["admin", "risk"]}); notify.success("告警已处置"); }, onError: (error) => notify.error(messageFor(error))});
  return <AdminPage title="风控工作台" eyebrow="Risk" description="处置交易、账户与履约风险告警。"><AdminPanel className="overflow-hidden p-3 sm:p-4"><AdminTableShell {...tableState(query, "暂无风险告警", "当前没有待处置告警。")}>{query.data?.items.length ? <table className={adminTableClass}><caption className="sr-only">风险告警</caption><AdminTableHead><th scope="col">等级</th><th scope="col">类型</th><th scope="col">对象</th><th scope="col">触发规则</th><th scope="col">状态</th><th scope="col">时间</th><th className="text-right" scope="col">操作</th></AdminTableHead><tbody>{query.data.items.map((item) => <tr key={item.id}><td>{item.level}</td><th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.alert_type}</th><td>{item.target_type} #{item.target_id}</td><td>{item.rule_detail}</td><td><StatusBadge status={item.status} /></td><td>{formatDateTime(item.created_at)}</td><td><div className="flex justify-end gap-2">{item.status === "pending" ? <><Button size="sm" variant="tertiary" onPress={() => mutation.mutate({id: item.id, decision: "dismiss"})}>忽略</Button><Button size="sm" variant="danger-soft" onPress={() => mutation.mutate({id: item.id, decision: "freeze"})}><InteractiveIcon icon={ShieldBan} size={14} />冻结</Button></> : "—"}</div></td></tr>)}</tbody></table> : null}</AdminTableShell></AdminPanel></AdminPage>;
}

export function AdminTickets() {
  const client = useQueryClient();
  const query = useQuery({queryKey: ["admin", "tickets"], queryFn: () => fetchAdminTickets({pageSize: 100})});
  const mutation = useMutation({mutationFn: ({id, decision}: {id: number; decision: "claim" | "resolve" | "close"}) => updateAdminTicket(id, decision), onSuccess: async () => { await client.invalidateQueries({queryKey: ["admin", "tickets"]}); notify.success("工单状态已更新"); }, onError: (error) => notify.error(messageFor(error))});
  return <AdminPage title="工单处理" eyebrow="Support" description="处理故障、不可用与交易申诉。"><AdminPanel className="overflow-hidden p-3 sm:p-4"><AdminTableShell {...tableState(query, "暂无工单", "买家提交工单后会显示在这里。")}>{query.data?.items.length ? <table className={adminTableClass}><caption className="sr-only">平台工单</caption><AdminTableHead><th scope="col">工单号</th><th scope="col">标题</th><th scope="col">买家</th><th scope="col">关联订单</th><th scope="col">状态</th><th scope="col">更新时间</th><th className="text-right" scope="col">操作</th></AdminTableHead><tbody>{query.data.items.map((item) => <tr key={item.id}><th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.ticket_no}</th><td>{item.title}</td><td>UID-{item.buyer_id}</td><td>{item.order_no}</td><td><StatusBadge status={item.status} /></td><td>{formatDateTime(item.updated_at)}</td><td className="text-right">{item.status === "pending" ? <Button size="sm" variant="primary" onPress={() => mutation.mutate({id: item.id, decision: "claim"})}>接单</Button> : item.status === "processing" ? <Button size="sm" variant="primary" onPress={() => mutation.mutate({id: item.id, decision: "resolve"})}><InteractiveIcon icon={Check} size={14} />完成</Button> : item.status === "resolved" ? <Button size="sm" variant="tertiary" onPress={() => mutation.mutate({id: item.id, decision: "close"})}>关闭</Button> : "—"}</td></tr>)}</tbody></table> : null}</AdminTableShell></AdminPanel></AdminPage>;
}

export function AdminUsers() {
  const client = useQueryClient();
  const query = useQuery({queryKey: ["admin", "users"], queryFn: () => fetchAdminUsers()});
  const mutation = useMutation({mutationFn: (id: number) => freezeAdminUser(id), onSuccess: async () => { await client.invalidateQueries({queryKey: ["admin", "users"]}); notify.success("账户已冻结"); }, onError: (error) => notify.error(messageFor(error))});
  return <AdminPage title="用户管理" eyebrow="Accounts" description="查看账户身份和当前状态。"><AdminPanel className="overflow-hidden p-3 sm:p-4"><AdminTableShell {...tableState(query, "暂无用户数据", "用户服务尚未返回账户记录。")}>{query.data?.length ? <table className={adminTableClass}><caption className="sr-only">平台用户</caption><AdminTableHead><th scope="col">账户</th><th scope="col">手机号</th><th scope="col">邮箱</th><th scope="col">角色</th><th scope="col">状态</th><th scope="col">注册时间</th><th className="text-right" scope="col">操作</th></AdminTableHead><tbody>{query.data.map((item) => <tr key={item.id}><th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">UID-{item.id}</th><td>{item.phone}</td><td>{item.email || "—"}</td><td>{item.roles.join(" / ")}</td><td><StatusBadge status={item.status} /></td><td>{formatDateTime(item.created_at)}</td><td className="text-right">{item.status === "active" ? <Button size="sm" variant="danger-soft" onPress={() => mutation.mutate(item.id)}>冻结</Button> : "—"}</td></tr>)}</tbody></table> : null}</AdminTableShell></AdminPanel></AdminPage>;
}

export function AdminAudit() {
  const query = useQuery({queryKey: ["admin", "audit"], queryFn: () => fetchAdminAuditLogs({pageSize: 100})});
  return <AdminPage title="审计日志" eyebrow="Audit" description="追踪后台关键操作与变更记录。"><AdminPanel className="overflow-hidden p-3 sm:p-4"><AdminTableShell {...tableState(query, "暂无审计记录", "管理员操作后会形成审计记录。")}>{query.data?.items.length ? <table className={adminTableClass}><caption className="sr-only">审计日志</caption><AdminTableHead><th scope="col">操作人</th><th scope="col">动作</th><th scope="col">对象</th><th scope="col">结果</th><th scope="col">IP</th></AdminTableHead><tbody>{query.data.items.map((item) => <tr key={item.id}><td>UID-{item.operator_id}</td><th className="px-4 py-3.5 font-medium text-[#173447]" scope="row">{item.action}</th><td>{item.target_type} #{item.target_id || "—"}</td><td className="max-w-80 truncate">{item.after_value || "—"}</td><td>{item.ip || "—"}</td></tr>)}</tbody></table> : null}</AdminTableShell></AdminPanel></AdminPage>;
}

function tableState(query: {isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown}, emptyTitle: string, emptyDescription: string) {
  return {emptyTitle, emptyDescription, isLoading: query.isPending, error: query.isError ? messageFor(query.error) : undefined, onRetry: () => void query.refetch()};
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "请求未完成";
}
