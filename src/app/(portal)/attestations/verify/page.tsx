import {VerificationLookup} from "@/components/attestations/attestation-views";

export default async function Page({searchParams}: {searchParams: Promise<{id?: string; type?: string}>}) {
  const params = await searchParams;
  const type = params.type === "delivery" || params.type === "violation" ? params.type : "order";
  return <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
    <h1 className="text-3xl font-semibold tracking-tight">存证查验</h1>
    <p className="mt-3 mb-8 text-sm leading-6 text-muted">输入订单编号，核对原始业务数据与链上存证摘要。</p>
    <VerificationLookup initialId={typeof params.id === "string" ? params.id.slice(0, 128) : ""} initialType={type} />
  </main>;
}
