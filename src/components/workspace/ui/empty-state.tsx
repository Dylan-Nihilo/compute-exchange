// 列表空态: 标题 + 引导文案, 与 ErrorState 互补(一个是加载失败, 一个是真的没有数据)。
export function EmptyState({
  description,
  title,
}: {
  description?: string;
  title: string;
}) {
  return (
    <div className="grid h-full min-h-[inherit] place-items-center px-5 text-center">
      <div>
        <h2 className="text-lg font-semibold text-[#173447]">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm text-[#78909c]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
