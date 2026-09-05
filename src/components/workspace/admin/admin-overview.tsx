"use client";

import {Button, Link, Skeleton} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  ClipboardList,
  ShieldAlert,
} from "lucide";
import {useRouter} from "next/navigation";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {
  fetchAdminQualifications,
  fetchAdminSummary,
  fetchAdminTickets,
} from "@/lib/admin-workspace";
import {formatDateTime} from "@/lib/format/date";

import {AdminMetric, AdminPage, AdminPanel, StatusBadge} from "./admin-ui";

export function AdminOverview() {
  const router = useRouter();
  const summary = useQuery({
    queryKey: ["admin", "summary"],
    queryFn: () => fetchAdminSummary(),
  });
  const qualifications = useQuery({
    queryKey: ["admin", "qualifications", "pending"],
    queryFn: () => fetchAdminQualifications(),
  });
  const tickets = useQuery({
    queryKey: ["admin", "tickets", "pending"],
    queryFn: () => fetchAdminTickets({status: "pending", pageSize: 5}),
  });

  return (
    <AdminPage
      actions={
        <Button
          className="h-10 rounded-xl bg-[#c9f556] px-5 text-sm font-semibold text-[#173447] hover:bg-[#b8e643]"
          onPress={() => router.push("/admin/reviews")}
        >
          进入审核中心
          <InteractiveIcon icon={ArrowRight} size={16} />
        </Button>
      }
      description="集中处理准入、商品、履约与风险事项。"
      eyebrow="Operations"
      title="运营总览"
    >
      <AdminPanel className="grid grid-cols-2 gap-y-6 px-5 py-5 sm:grid-cols-4 sm:px-6">
        {summary.isPending ? (
          ["a", "b", "c", "d"].map((key) => (
            <Skeleton className="h-14 w-[72%] rounded-lg" key={key} />
          ))
        ) : summary.isError ? (
          <div className="col-span-full flex min-h-14 items-center justify-between gap-4">
            <p className="text-sm text-[#5e7786]">运营数据读取失败，请重试。</p>
            <Button size="sm" variant="tertiary" onPress={() => void summary.refetch()}>重新读取</Button>
          </div>
        ) : (
          <>
            <AdminMetric label="待审资质" value={summary.data?.pendingQualifications ?? 0} />
            <AdminMetric label="待审商品" value={summary.data?.pendingProducts ?? 0} />
            <AdminMetric label="进行中订单" value={summary.data?.activeOrders ?? 0} />
            <AdminMetric
              label="未处置告警"
              tone={(summary.data?.openRiskAlerts ?? 0) > 0 ? "danger" : "default"}
              value={summary.data?.openRiskAlerts ?? 0}
            />
          </>
        )}
      </AdminPanel>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminPanel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#dce9ee]/70 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold text-[#173447]">当前审核队列</h2>
              <p className="mt-1 text-xs text-[#78909c]">优先处理影响业务准入的申请</p>
            </div>
            <Link className="text-xs font-medium text-[#356b84]" href="/admin/reviews">
              查看全部
            </Link>
          </div>
          <div className="min-h-64 px-5 sm:px-6">
            {qualifications.isPending ? (
              <div className="space-y-3 py-5">
                {["a", "b", "c"].map((key) => <Skeleton className="h-16 rounded-xl" key={key} />)}
              </div>
            ) : qualifications.data?.length ? (
              <ul>
                {qualifications.data.slice(0, 4).map((item) => (
                  <li className="flex items-center gap-4 border-b border-[#dce9ee]/60 py-4 last:border-0" key={item.id}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eaf5f8] text-[#426d82]">
                      <InteractiveIcon icon={BadgeCheck} size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#173447]">{item.cert_name}</p>
                      <p className="mt-1 text-xs text-[#78909c]">
                        用户 {item.user_id} · {formatDateTime(item.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <p className="text-sm font-medium text-[#173447]">审核队列已清空</p>
                  <p className="mt-1 text-xs text-[#78909c]">新的准入申请会出现在这里。</p>
                </div>
              </div>
            )}
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden">
          <div className="border-b border-[#dce9ee]/70 px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold text-[#173447]">待处理工单</h2>
            <p className="mt-1 text-xs text-[#78909c]">买家故障与交易申诉</p>
          </div>
          <div className="min-h-64 px-5 sm:px-6">
            {tickets.isPending ? (
              <div className="space-y-3 py-5">
                {["a", "b", "c"].map((key) => <Skeleton className="h-14 rounded-xl" key={key} />)}
              </div>
            ) : tickets.data?.items.length ? (
              <ul>
                {tickets.data.items.map((ticket) => (
                  <li className="border-b border-[#dce9ee]/60 py-4 last:border-0" key={ticket.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#173447]">{ticket.title}</p>
                        <p className="mt-1 text-xs text-[#78909c]">{ticket.ticket_no}</p>
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <p className="text-sm font-medium text-[#173447]">没有待处理工单</p>
                  <p className="mt-1 text-xs text-[#78909c]">当前服务队列正常。</p>
                </div>
              </div>
            )}
          </div>
        </AdminPanel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {href: "/admin/reviews", label: "准入审核", icon: BadgeCheck},
          {href: "/admin/products", label: "商品治理", icon: Boxes},
          {href: "/admin/orders", label: "订单干预", icon: ClipboardList},
          {href: "/admin/risk", label: "风险处置", icon: ShieldAlert},
        ].map((item) => (
          <Link
            className="group flex items-center justify-between rounded-[16px] border border-[#c8d9e0]/45 bg-white/45 px-4 py-4 text-sm font-medium text-[#24495d] no-underline transition-colors hover:bg-white/80"
            href={item.href}
            key={item.href}
          >
            <span className="flex items-center gap-3">
              <InteractiveIcon icon={item.icon} size={17} />
              {item.label}
            </span>
            <InteractiveIcon className="transition-transform group-hover:translate-x-0.5" icon={ArrowRight} size={15} />
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
