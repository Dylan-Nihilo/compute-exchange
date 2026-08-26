import {ticketTypeCopy} from "@/lib/buyer-tickets";

// 工单类型 chip: 列表卡片与详情信息卡共用。
export function TicketTypeChip({type}: {type: string}) {
  return (
    <span className="rounded-full border border-[#dce9ee] bg-white/70 px-2 py-0.5 text-[11px] text-[#5e7786]">
      {ticketTypeCopy[type] ?? type}
    </span>
  );
}
