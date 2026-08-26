import type {ReactNode} from "react";

export const glassCardClass =
  "rounded-[20px] border border-[#afc4ce]/20 bg-white/60 shadow-[0_10px_28px_-18px_rgba(14,48,69,0.12)] backdrop-blur-xl";

// 工作台玻璃卡片容器: 发票/工单/消息等页面的卡片统一底座。
export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`${glassCardClass} ${className}`}>{children}</section>;
}
