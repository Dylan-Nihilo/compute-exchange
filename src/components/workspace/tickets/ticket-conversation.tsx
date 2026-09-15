import type {TicketMessage} from "@/lib/buyer-tickets";
import {formatDateTime} from "@/lib/format/date";

// 当前阅读方的消息靠右，买家与运营共用同一份沟通记录。
export function TicketConversation({messages, viewer = "buyer"}: {messages: readonly TicketMessage[]; viewer?: "buyer" | "operator"}) {
  return (
    <ol className="space-y-4">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} viewer={viewer} />
      ))}
    </ol>
  );
}

function MessageBubble({message, viewer}: {message: TicketMessage; viewer: "buyer" | "operator"}) {
  const isBuyer = message.sender_type === "buyer";
  const isOwnSide = message.sender_type === viewer;
  return (
    <li className={`flex ${isOwnSide ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
        isOwnSide
          ? "rounded-br-md bg-[#d6f0fb]/70 text-[#173447]"
          : "rounded-bl-md border border-[#dce9ee] bg-white/80 text-[#24495d]"
      }`}>
        <p className="text-[11px] font-medium text-[#7b929e]">
          {isBuyer ? viewer === "buyer" ? "我" : "买家" : "平台运营"} · {formatDateTime(message.created_at)}
        </p>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
      </div>
    </li>
  );
}
