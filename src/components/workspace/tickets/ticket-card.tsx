import Image from "next/image";

import {TicketStatusBadge} from "./ticket-status-badge";
import {TicketTypeChip} from "./ticket-type-chip";
import type {BuyerTicket} from "@/lib/buyer-tickets";
import {formatDateTime} from "@/lib/format/date";

// 工单列表卡片: 状态 + 编号 / 标题 / 类型 + 关联订单 + 提交时间, 点击进入详情。
export function TicketCard({
  ticket,
  onViewDetail,
}: {
  ticket: BuyerTicket;
  onViewDetail: (ticketNo: string) => void;
}) {
  return (
    <button
      className="group flex w-full items-center gap-4 rounded-[20px] border border-[#afc4ce]/20 bg-white/60 px-5 py-4 text-left shadow-[0_10px_28px_-18px_rgba(14,48,69,0.12)] backdrop-blur-xl transition-colors hover:bg-white/75"
      onClick={() => onViewDetail(ticket.ticket_no)}
      type="button"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <TicketStatusBadge status={ticket.status} />
          <span className="text-xs text-[#8aa0ab]">{ticket.ticket_no}</span>
        </div>
        <h2 className="mt-2 truncate text-[15px] font-semibold text-[#173447]">
          {ticket.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#78909c]">
          <TicketTypeChip type={ticket.type} />
          <span>关联订单: {ticket.order_no}</span>
          <span>提交时间: {formatDateTime(ticket.created_at)}</span>
        </div>
      </div>
      <Image
        alt=""
        aria-hidden="true"
        className="shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
        height={16}
        src="/images/buyer-workspace/order-detail/chevron-right.svg"
        width={16}
      />
    </button>
  );
}
