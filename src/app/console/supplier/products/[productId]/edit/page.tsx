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
  if (!product || product.status !== "draft") return <ErrorState title="商品无法修改" description="仅可修改并重新提交自己的草稿或被驳回的商品。" />;
  return <SupplierProductForm key={product.id} product={product} />;
}
