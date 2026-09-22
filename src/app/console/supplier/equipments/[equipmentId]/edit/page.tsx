"use client";

import {useQuery} from "@tanstack/react-query";
import {Skeleton} from "@heroui/react";
import Link from "next/link";
import {use} from "react";

import {SupplierEquipmentForm} from "@/components/workspace/supplier/equipment-form";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {fetchMyEquipments} from "@/lib/equipment-workspace";

// 修改并重提: 仅 draft(草稿/被驳回)商品可编辑; 后端没有单条 vendor 读取接口, 从本人列表中定位。
export default function EditSupplierEquipmentPage({params}: {params: Promise<{equipmentId: string}>}) {
  const {equipmentId} = use(params);
  const query = useQuery({
    queryKey: ["supplier", "equipments"],
    queryFn: () => fetchMyEquipments(),
  });
  const product = query.data?.items.find((item) => item.id === equipmentId);

  if (query.isPending) {
    return (
      <section className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6">
        <WorkspacePageHeader title="修改设备商品" />
        <Skeleton className="h-96 w-full rounded-[20px]" />
      </section>
    );
  }

  if (!product || (product.status !== "draft" && product.status !== "offline")) {
    return (
      <section className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6">
        <WorkspacePageHeader title="修改设备商品" />
        <GlassCard className="px-6 py-6">
          <EmptyState
            description={product ? "只有草稿/被驳回或已下架的商品可以修改重提；在售商品请先下架。重新提交后将再次进入审核。" : "没有找到该商品，或它不属于当前账号。"}
            title="无法编辑该商品"
          />
          <div className="mt-4 text-center">
            <Link className="text-sm font-medium text-accent underline-offset-4 hover:underline" href="/console/supplier/equipments">
              返回设备商品管理
            </Link>
          </div>
        </GlassCard>
      </section>
    );
  }

  return <SupplierEquipmentForm product={product} />;
}
