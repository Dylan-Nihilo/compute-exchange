"use client";

import {Button} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {ErrorState, LoadingState} from "@/components/system/operation-state";
import {useCurrentAccount} from "@/lib/auth/queries";
import {formatDateTime} from "@/lib/format/date";
import {legalDocuments, type LegalDocumentKey} from "@/lib/legal";
import {consentDocumentHref, fetchLegalConsents} from "@/lib/legal-consents";

const actionCopy: Record<string, string> = {
  registration: "账户注册",
  publish: "商品发布",
  resubmit: "商品重新提交",
  order: "订单交易",
  kyc_personal: "个人认证",
  kyc_enterprise: "企业认证",
};

export default function ConsentHistoryPage() {
  const account = useCurrentAccount().data;
  const query = useQuery({queryKey: ["auth", "consents", account?.id], queryFn: () => fetchLegalConsents(), enabled: Boolean(account)});
  return <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-7 sm:px-6 lg:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div><h1 className="text-2xl font-semibold text-foreground">授权同意记录</h1><p className="mt-2 text-sm leading-6 text-muted">查看当前账户最近 100 条同意记录及对应协议版本。</p></div>
      <Button variant="outline" isDisabled={query.isFetching} isPending={query.isFetching} onPress={() => void query.refetch()}>刷新记录</Button>
    </header>
    {query.isPending ? <LoadingState label="正在读取授权记录" /> : query.isError ? <ErrorState title="授权记录暂时不可用" description={query.error.message} isPending={query.isFetching} onRetry={() => void query.refetch()} /> : query.data.length ? <>
      <p className="text-sm text-muted">共显示 {query.data.length} 条记录</p>
      <ol className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {query.data.map((record, index) => {
          const href = consentDocumentHref(record);
          const title = Object.hasOwn(legalDocuments, record.document) ? legalDocuments[record.document as LegalDocumentKey] : record.document;
          return <li className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start" key={`${record.document}-${record.accepted_at}-${index}`}>
            <div><h2 className="break-words font-semibold text-foreground">{title}</h2><p className="mt-2 break-all text-sm text-muted">版本 {record.version}</p></div>
            <dl className="min-w-0 text-sm"><dt className="text-muted">同意场景</dt><dd className="mt-1 text-foreground">{actionCopy[record.action] ?? record.action}</dd><dt className="mt-2 text-muted">关联编号</dt><dd className="mt-1 break-all text-foreground">{record.reference || "—"}</dd></dl>
            <dl className="text-sm"><dt className="text-muted">同意时间</dt><dd className="mt-1 text-foreground"><time dateTime={record.accepted_at}>{formatDateTime(record.accepted_at)}</time></dd></dl>
            {href ? <a className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href={href} target="_blank" rel="noopener noreferrer">查看正文<span className="sr-only">：{title}，版本 {record.version}，在新标签页打开</span></a> : <p className="text-sm leading-6 text-muted">该版本正文暂不可用</p>}
          </li>;
        })}
      </ol>
    </> : <div className="py-16 text-center"><h2 className="text-lg font-semibold text-foreground">暂无同意记录</h2><p className="mt-3 text-sm text-muted">当前账户没有可显示的授权同意记录。</p></div>}
  </section>;
}
