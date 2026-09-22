"use client";

import {useQuery} from "@tanstack/react-query";
import {useParams} from "next/navigation";

import {ErrorState, LoadingState} from "@/components/system/operation-state";
import {SupplierProductForm} from "@/components/workspace/supplier/product-form";
import {fetchMyProducts} from "@/lib/supplier-workspace";

export default function EditSupplierProductPage() {
  const {productId} = useParams<{productId: string}>();
  const query = useQuery({queryKey: ["supplier", "products", "editable"], queryFn: () => fetchMyProducts()});
  if (query.isPending) return <LoadingState label="正在读取商品" />;
  if (query.isError) return <ErrorState description={query.error.message} onRetry={() => void query.refetch()} />;
  const product = query.data.find((item) => String(item.id) === productId);
  if (!product || (product.status !== "draft" && product.status !== "offline")) {
    return <ErrorState title="商品无法修改" description="仅可修改草稿/被驳回或已下架的商品；在售商品请先下架。重新提交后将再次进入审核。" />;
  }
  return <SupplierProductForm key={product.id} product={product} />;
}
