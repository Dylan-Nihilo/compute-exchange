import type {TicketMessage} from "@/lib/buyer-tickets";
import {formatDateTime} from "@/lib/format/date";

// 工单沟通记录: 买家右侧蓝泡 / 运营左侧白泡。
export function TicketConversation({messages}: {messages: readonly TicketMessage[]}) {
  return (
    <ol className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </ol>
  );
}

function MessageBubble({message}: {message: TicketMessage}) {
  const isBuyer = message.sender_type === "buyer";
  return (
    <li className={`flex ${isBuyer ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
        isBuyer
          ? "rounded-br-md bg-[#d6f0fb]/70 text-[#173447]"
          : "rounded-bl-md border border-[#dce9ee] bg-white/80 text-[#24495d]"
      }`}>
        <p className="text-[11px] font-medium text-[#7b929e]">
          {isBuyer ? "我" : "平台运营"} · {formatDateTime(message.created_at)}
        </p>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
      </div>
    </li>
  );
}
