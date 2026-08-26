import {ticketStatusCopy, type TicketStatus} from "@/lib/buyer-tickets";

const statusTone: Record<TicketStatus, string> = {
  pending: "bg-[#fff3e0] text-[#b25e09]",
  processing: "bg-[#e3f2fd] text-[#1d63ae]",
  resolved: "bg-[#e5f7d9] text-[#4c7c0f]",
  closed: "bg-[#edf1f3] text-[#78909c]",
};

// 工单状态徽章: 列表卡片、详情信息卡共用。
export function TicketStatusBadge({status}: {status: TicketStatus}) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone[status]}`}>
      {ticketStatusCopy[status]}
    </span>
  );
}
