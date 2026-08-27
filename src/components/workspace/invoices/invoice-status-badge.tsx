import {
  invoiceStatusCopy,
  type BuyerInvoice,
  type InvoiceStatus,
} from "@/lib/buyer-invoices";

const statusTone: Record<InvoiceStatus, string> = {
  pending: "bg-[#e3f2fd] text-[#1d63ae]",
  issued: "bg-[#e5f7d9] text-[#4c7c0f]",
  rejected: "bg-[#fdeaea] text-[#c4392f]",
  red_flushed: "bg-[#edf1f3] text-[#78909c]",
};

// 发票状态徽章: 历史发票表格使用; 驳回时 tooltip 显示原因。
export function InvoiceStatusBadge({invoice}: {invoice: BuyerInvoice}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[invoice.status]}`}
      title={invoice.status === "rejected" ? (invoice.reject_reason ?? undefined) : undefined}
    >
      {invoiceStatusCopy[invoice.status]}
    </span>
  );
}
