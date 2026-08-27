import type {ReactNode} from "react";

// 工作台页面标题栏: 左侧标题, 右侧主操作区(如「申请开票」「提交工单」按钮)。
export function WorkspacePageHeader({
  actions,
  title,
}: {
  actions?: ReactNode;
  title: string;
}) {
  return (
    <header className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold text-[#173447]">{title}</h1>
      {actions}
    </header>
  );
}
