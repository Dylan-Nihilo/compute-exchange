"use client";

import {useMutation, useQuery} from "@tanstack/react-query";
import {Button} from "@heroui/react";
import Link from "next/link";
import {useParams} from "next/navigation";

import {AccessBoundary} from "@/components/auth/access-boundary";
import {ErrorState, LoadingState} from "@/components/system/operation-state";
import {getMarketProduct, submitProductInquiry} from "@/lib/market-api";

export default function ProductInquiryPage() {
  return <AccessBoundary role="buyer"><InquiryForm /></AccessBoundary>;
}

function InquiryForm() {
  const {productId} = useParams<{productId: string}>();
  const query = useQuery({queryKey: ["market", "product", productId], queryFn: () => getMarketProduct(productId)});
  const mutation = useMutation({mutationFn: (input: {contact_name: string; contact_phone: string; message: string}) => submitProductInquiry(productId, input)});
  if (query.isPending) return <LoadingState label="正在读取商品" />;
  if (query.isError) return <ErrorState description={query.error.message} onRetry={() => void query.refetch()} />;
  const product = query.data;
  if (!product || product.status !== "active" || product.unitPriceMinor) return <ErrorState title="该商品暂不支持询价" />;
  const inputClass = "mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent";
  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link className="text-sm text-muted underline" href={`/market/${productId}`}>返回商品详情</Link>
      <h1 className="mt-6 text-2xl font-semibold">申请报价</h1>
      <p className="mt-2 text-muted">{product.name} · {product.region} · 商品 #{productId}</p>
      {mutation.isSuccess ? (
        <div className="mt-8 rounded-2xl border border-border bg-white p-6" role="status">
          <h2 className="text-lg font-semibold">询价已提交</h2>
          <p className="mt-2 text-muted">询价编号 #{mutation.data.id}。平台将通过你填写的电话联系你，确认资源需求与报价。</p>
        </div>
      ) : (
        <form className="mt-8 space-y-5 rounded-2xl border border-border bg-white p-6" onSubmit={(event) => {
          event.preventDefault();
          if (mutation.isPending) return;
          const data = new FormData(event.currentTarget);
          mutation.mutate({contact_name: String(data.get("contact_name")).trim(), contact_phone: String(data.get("contact_phone")).trim(), message: String(data.get("message")).trim()});
        }}>
          <label className="block text-sm font-medium">联系人<input className={inputClass} name="contact_name" required maxLength={64} autoComplete="name" /></label>
          <label className="block text-sm font-medium">联系电话<input className={inputClass} name="contact_phone" required maxLength={20} type="tel" autoComplete="tel" /></label>
          <label className="block text-sm font-medium">采购需求<textarea className={`${inputClass} min-h-32 resize-y`} name="message" required minLength={5} maxLength={2000} placeholder="请说明资源数量、计划交付时间和使用周期" /></label>
          {mutation.isError ? <p className="text-sm text-danger" role="alert">{mutation.error.message}</p> : null}
          <Button fullWidth isPending={mutation.isPending} type="submit">提交询价</Button>
        </form>
      )}
    </main>
  );
}
