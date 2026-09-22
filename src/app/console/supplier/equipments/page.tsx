"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, Skeleton} from "@heroui/react";
import {useRouter} from "next/navigation";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {
  fetchMyEquipments,
  fetchVendorEquipmentInquiries,
  inquiryStatusCopy,
  offlineEquipmentProduct,
} from "@/lib/equipment-workspace";

const statusTone: Record<string, string> = {
  draft: "bg-[#edf1f3] text-[#78909c]",
  pending: "bg-[#fff3e0] text-[#b25e09]",
  active: "bg-[#e5f7d9] text-[#4c7c0f]",
  sold_out: "bg-[#fff3e0] text-[#b25e09]",
  offline: "bg-[#edf1f3] text-[#78909c]",
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {dateStyle: "short", timeStyle: "short"});

export default function SupplierEquipmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({
    queryKey: ["supplier", "equipments"],
    queryFn: () => fetchMyEquipments(),
  });
  const inquiriesQuery = useQuery({
    queryKey: ["supplier", "equipment-inquiries"],
    queryFn: () => fetchVendorEquipmentInquiries(),
  });
  const offlineMutation = useMutation({
    mutationFn: (id: string) => offlineEquipmentProduct(id),
    onSuccess: () => void queryClient.invalidateQueries({queryKey: ["supplier", "equipments"]}),
  });

  const products = productsQuery.data?.items ?? [];
  const inquiries = inquiriesQuery.data?.items ?? [];

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        actions={
          <Button
            className="h-10 min-w-28 rounded-xl bg-[#c9f556] px-5 text-sm font-semibold text-[#173447] transition-colors hover:bg-[#b8e643]"
            onPress={() => router.push("/console/supplier/equipments/new")}
          >
            发布设备商品
          </Button>
        }
        title="设备商品"
      />

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">商品列表</h2>
        <p className="mt-1 text-xs text-[#78909c]">
          发布后进入平台审核，通过即在设备市场上架；设备为询价撮合，不支持在线支付。
        </p>
        <div aria-busy={productsQuery.isPending} className="mt-4 min-h-[200px]">
          {productsQuery.isPending ? (
            <div className="space-y-3">
              {["s1", "s2", "s3"].map((key) => <Skeleton className="h-14 w-full rounded-xl" key={key} />)}
            </div>
          ) : productsQuery.isError ? (
            <ErrorState
              description={productsQuery.error instanceof Error ? productsQuery.error.message : undefined}
              isPending={productsQuery.isFetching}
              onRetry={() => void productsQuery.refetch()}
              title="设备商品数据暂时不可用"
            />
          ) : products.length ? (
            <div className="omnis-scrollbar-x">
              <table className="w-full min-w-[980px] table-fixed border-collapse text-left">
                <caption className="sr-only">我的设备商品</caption>
                <colgroup>
                  <col className="w-[240px]" />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[120px]" />
                  <col className="w-[90px]" />
                  <col className="w-[90px]" />
                  <col className="w-[100px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">商品</th>
                    <th className="px-4" scope="col">类型</th>
                    <th className="px-4" scope="col">成色</th>
                    <th className="px-4" scope="col">单价</th>
                    <th className="px-4" scope="col">数量</th>
                    <th className="px-4" scope="col">地域</th>
                    <th className="px-4" scope="col">状态</th>
                    <th className="rounded-r-[14px] px-4" scope="col">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr className="border-b border-[#dce9ee]/75 last:border-0" key={product.id}>
                      <th className="px-4 py-3.5" scope="row">
                        <p className="truncate text-[13px] font-medium text-[#173447]">{product.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[#8aa0ab]">
                          {[product.brand, product.model].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </th>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{product.typeLabel}</td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{product.conditionLabel}</td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-[#173447]">
                        {product.priceLabel}
                        {product.priceNegotiable ? "" : `/${product.unitLabel}`}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{product.quantity}</td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{product.region || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[product.status] ?? statusTone.draft}`}>
                          {product.statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {product.status === "draft" || product.status === "offline" ? (
                          <Button
                            size="sm"
                            variant="tertiary"
                            onPress={() => router.push(`/console/supplier/equipments/${product.id}/edit`)}
                          >
                            {product.status === "offline" ? "修改并重新上架" : "修改并重提"}
                          </Button>
                        ) : product.status === "active" || product.status === "pending" ? (
                          <Button
                            isDisabled={offlineMutation.isPending}
                            size="sm"
                            variant="tertiary"
                            onPress={() => offlineMutation.mutate(product.id)}
                          >
                            下架
                          </Button>
                        ) : null}
                        {product.rejectedReason ? (
                          <p className="mt-1 text-xs text-[#b63b35]">驳回原因：{product.rejectedReason}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="发布第一个设备商品，审核通过后即在设备市场对买家可见。"
              title="还没有设备商品"
            />
          )}
          {offlineMutation.isError ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {offlineMutation.error instanceof Error ? offlineMutation.error.message : "商品下架失败"}
            </p>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">收到的询价</h2>
        <p className="mt-1 text-xs text-[#78909c]">买家询价同时进入平台 CRM，由采购顾问协同跟进促成交易。</p>
        <div aria-busy={inquiriesQuery.isPending} className="mt-4 min-h-[140px]">
          {inquiriesQuery.isPending ? (
            <div className="space-y-3">
              {["s1", "s2"].map((key) => <Skeleton className="h-12 w-full rounded-xl" key={key} />)}
            </div>
          ) : inquiriesQuery.isError ? (
            <ErrorState
              description={inquiriesQuery.error instanceof Error ? inquiriesQuery.error.message : undefined}
              isPending={inquiriesQuery.isFetching}
              onRetry={() => void inquiriesQuery.refetch()}
              title="询价数据暂时不可用"
            />
          ) : inquiries.length ? (
            <div className="omnis-scrollbar-x">
              <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
                <caption className="sr-only">收到的设备询价</caption>
                <colgroup>
                  <col className="w-[100px]" />
                  <col className="w-[80px]" />
                  <col className="w-[110px]" />
                  <col className="w-[130px]" />
                  <col />
                  <col className="w-[90px]" />
                  <col className="w-[150px]" />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">设备编号</th>
                    <th className="px-4" scope="col">数量</th>
                    <th className="px-4" scope="col">联系人</th>
                    <th className="px-4" scope="col">电话</th>
                    <th className="px-4" scope="col">留言</th>
                    <th className="px-4" scope="col">状态</th>
                    <th className="rounded-r-[14px] px-4" scope="col">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inquiry) => (
                    <tr className="border-b border-[#dce9ee]/75 last:border-0" key={inquiry.id}>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">#{inquiry.equipment_id}</td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{inquiry.quantity}</td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{inquiry.contact_name}</td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">{inquiry.contact_phone}</td>
                      <td className="px-4 py-3.5">
                        <p className="line-clamp-2 text-[13px] leading-5 text-[#24495d]">{inquiry.message || "—"}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                        {inquiryStatusCopy[inquiry.status] ?? inquiry.status}
                      </td>
                      <td className="px-4 py-3.5 text-[13px] text-[#24495d]">
                        {dateFormatter.format(new Date(inquiry.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState description="商品上架后，买家的询价会显示在这里。" title="暂无询价" />
          )}
        </div>
      </GlassCard>
    </section>
  );
}
