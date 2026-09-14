"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import Link from "next/link";
import {useState} from "react";

import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {AdminPage, AdminPanel} from "@/components/workspace/admin/admin-ui";
import {attestationStatus, attestationTypes, explorerURL, fetchAttestation, isAttestationVerified, requeueFailedAttestations, verifyAttestation, type AttestationType, type Verification} from "@/lib/attestations";
import {formatDateTime} from "@/lib/format/date";

const inputClass = "mt-2 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const panelClass = "rounded-[20px] border border-border bg-surface/80 p-5 sm:p-6";
const types = Object.keys(attestationTypes) as AttestationType[];

export function VerificationLookup({initialId = "", initialType = "order"}: {initialId?: string; initialType?: AttestationType}) {
  const [id, setId] = useState(initialId);
  const [type, setType] = useState<AttestationType>(initialType);
  const query = useMutation({mutationFn: ({type, id}: {type: AttestationType; id: string}) => verifyAttestation(type, id)});
  return <div className="space-y-5">
    <form className={`${panelClass} grid items-end gap-4 sm:grid-cols-[1fr_180px_auto]`} onSubmit={(event) => {
      event.preventDefault();
      if (id.trim() && !query.isPending) query.mutate({type, id: id.trim()});
    }}>
      <label className="text-sm font-medium">订单编号<input className={inputClass} required maxLength={128} value={id} disabled={query.isPending} placeholder="输入订单编号" onChange={(event) => {setId(event.target.value); query.reset();}} /></label>
      <label className="text-sm font-medium">存证事件<select className={inputClass} value={type} disabled={query.isPending} onChange={(event) => {setType(event.target.value as AttestationType); query.reset();}}>{types.map((value) => <option key={value} value={value}>{attestationTypes[value]}</option>)}</select></label>
      <Button type="submit" isDisabled={!id.trim() || query.isPending} isPending={query.isPending}>查验存证</Button>
    </form>
    <div aria-live="polite" aria-busy={query.isPending}>
      {query.isPending ? <p className="p-5 text-muted">正在查验存证…</p> : query.isError ? <p className={`${panelClass} text-danger`} role="alert">查验暂不可用：{query.error.message}。请重新查验。</p> : query.data ? <VerificationResult result={query.data} /> : null}
    </div>
  </div>;
}

function VerificationResult({result}: {result: Verification}) {
  const verified = isAttestationVerified(result);
  const url = explorerURL(result.verify_url);
  return <section className={panelClass}>
    <h2 className={`text-xl font-semibold ${result.db_hash_match === false ? "text-danger" : verified ? "text-success" : "text-foreground"}`}>
      {verified ? "存证查验通过" : result.db_hash_match === false ? "数据与存证不一致" : !result.data_hash ? "未查到存证记录" : "存证尚未通过查验"}
    </h2>
    <p className="mt-2 text-sm leading-6 text-muted">{verified ? "平台原始业务数据与存证摘要一致，链上已找到对应摘要。" : result.note || "尚不能确认原始数据与链上记录一致，请稍后重新查验。"}</p>
    {result.data_hash ? <dl className="mt-5 space-y-3 text-sm">
      <Field label="记录状态" value={attestationStatus(result.chain_status)} />
      <Field label="原始数据核对" value={result.db_hash_match === true ? "摘要一致" : result.db_hash_match === false ? "摘要不一致" : "尚未完成"} />
      <Field label="存证摘要" value={result.data_hash} />
      <Field label="链上交易" value={result.tx_id || "尚无交易编号"} />
      <Field label="存证时间" value={formatDateTime(result.chain_timestamp)} />
    </dl> : null}
    {url ? <a className="mt-5 inline-block text-sm text-accent underline underline-offset-4" href={url} target="_blank" rel="noopener noreferrer">前往区块链浏览器核对（新窗口）</a> : null}
  </section>;
}

function Field({label, value}: {label: string; value: string}) {
  return <div className="grid gap-1 sm:grid-cols-[112px_minmax(0,1fr)]"><dt className="text-muted">{label}</dt><dd className="min-w-0 break-all">{value}</dd></div>;
}

export function OrderAttestations({orderNo}: {orderNo: string}) {
  return <section className={panelClass} aria-label="存证时间线">
    <h2 className="text-base font-semibold">存证时间线</h2>
    <ol className="mt-2 divide-y divide-border">{types.map((type) => <AttestationRow key={`${orderNo}:${type}`} type={type} orderNo={orderNo} />)}</ol>
  </section>;
}

function AttestationRow({type, orderNo}: {type: AttestationType; orderNo: string}) {
  const query = useQuery({queryKey: ["attestations", type, orderNo], queryFn: () => fetchAttestation(type, orderNo), retry: false, staleTime: 0});
  const record = query.data;
  return <li className="py-5 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{attestationTypes[type]}</h3><Link className="text-accent underline underline-offset-4" href={`/attestations/verify?${new URLSearchParams({type, id: orderNo})}`}>查验{attestationTypes[type]}存证</Link></div>
    {query.isPending ? <p className="mt-3 text-muted">正在读取…</p> : query.isError ? <div className="mt-3" role="alert"><p className="text-danger">记录读取失败：{query.error.message}</p><Button className="mt-2" size="sm" variant="outline" isPending={query.isFetching} onPress={() => void query.refetch()}>重新读取{attestationTypes[type]}记录</Button></div> : !record ? <p className="mt-3 text-muted">暂无存证记录</p> : <>
      <p className={`mt-3 font-medium ${record.chain_status === "failed" ? "text-danger" : "text-muted"}`}>{attestationStatus(record.chain_status)}</p>
      <dl className="mt-3 space-y-2">
        <Field label="记录时间" value={formatDateTime(record.created_at)} />
        {record.confirmed_at ? <Field label="上链确认时间" value={formatDateTime(record.confirmed_at)} /> : null}
        <Field label="存证摘要" value={record.data_hash} />
        <Field label="链上交易" value={record.chain_tx_id || "尚无交易编号"} />
        <Field label="已尝试上链" value={`${record.attempts} 次`} />
        {record.last_error ? <Field label="最近失败原因" value={record.last_error} /> : null}
      </dl>
    </>}
  </li>;
}

export function AdminAttestations() {
  const client = useQueryClient();
  const [id, setId] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [confirm, setConfirm] = useState(false);
  const requeue = useMutation({mutationFn: () => requeueFailedAttestations(), onSuccess: () => {setConfirm(false); void client.invalidateQueries({queryKey: ["attestations"]});}});
  return <AdminPage title="存证管理" description="按订单查看存证进度，排查上链失败原因。">
    <AdminPanel className="p-5 sm:p-6">
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {event.preventDefault(); if (id.trim()) {setOrderNo(id.trim()); void client.invalidateQueries({queryKey: ["attestations"]});}}}>
        <label className="min-w-0 flex-1 text-sm font-medium">订单编号<input className={inputClass} required maxLength={128} value={id} onChange={(event) => setId(event.target.value)} /></label>
        <Button type="submit" isDisabled={!id.trim()}>查询记录</Button>
      </form>
    </AdminPanel>
    {orderNo ? <OrderAttestations orderNo={orderNo} /> : null}
    <AdminPanel className="p-5 sm:p-6">
      <h2 className="text-base font-semibold">失败存证补推</h2>
      <p className="mt-2 text-sm leading-6 text-muted">确认上链故障已排除后，将全平台失败记录重新排队。重新排队不代表已上链。</p>
      <Button className="mt-4" variant="outline" isDisabled={requeue.isPending} onPress={() => {requeue.reset(); setConfirm(true);}}>补推全部失败存证</Button>
      {requeue.isSuccess ? <p className="mt-3 text-sm" role="status">{requeue.data ? `已重新排队 ${requeue.data} 条存证，请稍后查询上链结果。` : "没有需要补推的失败存证。"}</p> : null}
      {requeue.isError ? <p className="mt-3 text-sm text-danger" role="alert">补推失败：{requeue.error.message}。请核对记录状态后重试。</p> : null}
    </AdminPanel>
    <ConfirmDialog open={confirm} title="补推全部失败存证？" description={`此操作影响全平台所有失败存证，不限于当前查询的订单；记录将重新进入上链队列。${requeue.isError ? ` 补推失败：${requeue.error.message}。请核对状态后重试。` : ""}`} confirmLabel="确认全部补推" isPending={requeue.isPending} onCancel={() => setConfirm(false)} onConfirm={() => {if (!requeue.isPending) requeue.mutate();}} />
  </AdminPage>;
}
