"use client";

import {Button, Skeleton} from "@heroui/react";
import Image from "next/image";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {InvoiceStatusBadge} from "@/components/workspace/invoices/invoice-status-badge";
import {
  invoiceDownloadUrl,
  invoiceTypeCopy,
  maskBankAccount,
  maskTaxNo,
  type BuyerInvoice,
  type InvoiceTitle,
} from "@/lib/buyer-invoices";
import {formatDateTime} from "@/lib/format/date";

const money = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  minimumFractionDigits: 2,
  style: "currency",
});

export type BuyerInvoicesViewProps = {
  error?: string | null;
  invoices: readonly BuyerInvoice[];
  isLoading?: boolean;
  isRetrying?: boolean;
  page: number;
  title: InvoiceTitle | null;
  titleError?: string | null;
  totalPages: number;
  onApply: () => void;
  onEditTitle: () => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onRetryTitle: () => void;
};

export function BuyerInvoicesView({
  error = null,
  invoices,
  isLoading = false,
  isRetrying = false,
  page,
  title,
  titleError = null,
  totalPages,
  onApply,
  onEditTitle,
  onPageChange,
  onRetry,
  onRetryTitle,
}: BuyerInvoicesViewProps) {
  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        actions={
          <Button
            className="h-10 min-w-28 rounded-xl bg-[#c9f556] px-5 text-sm font-semibold text-[#173447] transition-colors hover:bg-[#b8e643]"
            onPress={onApply}
          >
            申请开票
          </Button>
        }
        title="发票管理"
      />

      <GlassCard aria-label="开票信息" className="px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <CardHeading icon="file-check.svg" label="开票信息" />
          <Button
            className="h-8 min-w-16 px-3 text-xs"
            onPress={onEditTitle}
            variant="outline"
          >
            编辑
          </Button>
        </div>
        {titleError ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#c4392f]" role="alert">
              开票信息读取失败: {titleError}
            </p>
            <Button
              className="h-8 min-w-16 px-3 text-xs"
              onPress={onRetryTitle}
              variant="outline"
            >
              重试
            </Button>
          </div>
        ) : title ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TitleField label="企业名称" value={title.company_name} />
            <TitleField label="纳税人识别号" value={maskTaxNo(title.tax_no)} />
            <TitleField label="开户行" value={title.bank_name} />
            <TitleField label="银行账号" value={maskBankAccount(title.bank_account)} />
          </dl>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#78909c]">
              尚未设置开票信息，申请开票前请先完善企业抬头。
            </p>
            <Button
              className="h-8 min-w-24 px-3 text-xs"
              onPress={onEditTitle}
              variant="primary"
            >
              去完善
            </Button>
          </div>
        )}
      </GlassCard>

      <GlassCard aria-label="历史发票" className="px-5 py-5 sm:px-6">
        <CardHeading icon="order-detail/receipt.svg" label="历史发票" />

        <div aria-busy={isLoading} className="mt-5 min-h-[300px]">
          {isLoading ? (
            <InvoicesSkeleton />
          ) : error ? (
            <div className="grid min-h-[300px] place-items-center">
              <ErrorState
                description={error}
                isPending={isRetrying}
                onRetry={onRetry}
                title="发票数据暂时不可用"
              />
            </div>
          ) : invoices.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] table-fixed border-collapse text-left">
                <caption className="sr-only">历史发票列表</caption>
                <colgroup>
                  <col className="w-[170px]" />
                  <col className="w-[140px]" />
                  <col className="w-[170px]" />
                  <col className="w-[130px]" />
                  <col className="w-[110px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="h-11 bg-[#d6f0fb]/45 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[14px] px-4" scope="col">发票号</th>
                    <th className="px-4" scope="col">金额</th>
                    <th className="px-4" scope="col">类型</th>
                    <th className="px-4" scope="col">申请时间</th>
                    <th className="px-4" scope="col">状态</th>
                    <th className="rounded-r-[14px] px-4 text-right" scope="col">下载</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      className="border-b border-[#dce9ee]/75 last:border-0"
                      key={invoice.invoice_no}
                    >
                      <th className="px-4 py-4 text-[13px] font-medium text-[#173447]" scope="row">
                        {invoice.invoice_no}
                      </th>
                      <td className="px-4 py-4 text-[13px] font-semibold text-[#173447]">
                        {money.format(invoice.amount_fen / 100)}
                      </td>
                      <td className="px-4 py-4 text-[13px] text-[#24495d]">
                        {invoiceTypeCopy[invoice.invoice_type] ?? invoice.invoice_type}
                      </td>
                      <td className="px-4 py-4 text-[12px] leading-5 text-[#78909c]">
                        {formatDateTime(invoice.applied_at)}
                      </td>
                      <td className="px-4 py-4">
                        <InvoiceStatusBadge invoice={invoice} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        {invoice.status === "issued" ? (
                          <a
                            className="inline-flex h-8 min-w-16 items-center justify-center rounded-lg border border-[#afc4ce]/45 bg-transparent px-3 text-xs font-medium text-[#24495d] transition-colors hover:bg-white/60"
                            href={invoiceDownloadUrl(invoice.invoice_no)}
                          >
                            PDF
                          </a>
                        ) : (
                          <span className="text-xs text-[#9cb0ba]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="min-h-[300px]">
              <EmptyState
                description="点击右上角「申请开票」，选择已支付订单提交开票申请。"
                title="还没有发票记录"
              />
            </div>
          )}
        </div>

        {!isLoading && !error ? (
          <div className="mt-4">
            <ListPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        ) : null}
      </GlassCard>
    </section>
  );
}

function CardHeading({icon, label}: {icon: string; label: string}) {
  return (
    <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-[#173447]">
      <Image
        alt=""
        aria-hidden="true"
        height={18}
        src={`/images/buyer-workspace/${icon}`}
        width={18}
      />
      {label}
    </h2>
  );
}

function TitleField({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-[#9cb0ba]">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-[#173447]">{value}</dd>
    </div>
  );
}

function InvoicesSkeleton() {
  return (
    <div className="space-y-3">
      {["s1", "s2", "s3"].map((key) => (
        <Skeleton className="h-14 w-full rounded-xl" key={key} />
      ))}
    </div>
  );
}
