"use client";

import Link from "next/link";

import {GlassCard} from "@/components/workspace/ui/glass-card";
import {isManagedProduct, productStatusCopy, type SupplierProduct} from "@/lib/supplier-workspace";

// Managed listings: stock is derived by the platform from free slots on verified nodes
// (docs/26 §26.6), so it is shown read-only here and never goes through stock reports.
export function ManagedStockCard({products}: {products: SupplierProduct[]}) {
  const managed = products.filter(isManagedProduct);
  if (managed.length === 0) return null;

  return (
    <GlassCard className="px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0c1a25]">托管商品库存</h2>
          <p className="mt-0.5 text-xs text-[#5c788a]">
            由平台按探活通过节点的空闲卡槽自动计算，不能手动上报；调整库存请在节点管理中预留或释放卡槽。
          </p>
        </div>
        <Link
          className="rounded-lg px-2 py-1 text-[13px] font-medium text-[#24495d] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#5f8fa3] focus-visible:outline-none"
          href="/console/supplier/nodes"
        >
          前往节点管理
        </Link>
      </div>
      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {managed.map((product) => (
          <li className="rounded-xl border border-[#dce9ee] bg-white/55 px-4 py-3" key={product.id}>
            <p className="truncate text-[13px] font-medium text-[#0c1a25]">
              {(product.gpu_model || "算力资源").replace(/^NVIDIA\s+/i, "")}
              <span className="ml-2 text-[11px] font-normal text-[#8aa0ab]">PRD-#{product.id}</span>
            </p>
            <p className="mt-1.5 text-[13px] text-[#24495d]">
              可售 <span className="font-semibold tabular-nums">{product.stock}</span> 卡
              {product.max_free_per_node != null ? (
                <span className="text-[#5c788a]"> · 单机最多可租 {product.max_free_per_node} 卡</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[11px] text-[#8aa0ab]">{productStatusCopy[product.status] ?? product.status}</p>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
