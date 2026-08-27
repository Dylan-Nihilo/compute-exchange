import {Button} from "@heroui/react";

// 列表分页条: 上一页/下一页 + 页码指示。
export function ListPagination({
  align = "end",
  page,
  totalPages,
  onPageChange,
}: {
  align?: "start" | "center" | "end";
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const justify = align === "center" ? "justify-center" : align === "start" ? "justify-start" : "justify-end";
  return (
    <nav aria-label="分页" className={`flex items-center ${justify} gap-2 text-xs text-[#78909c]`}>
      <Button
        className="h-8 min-w-16 px-3"
        isDisabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        variant="outline"
      >
        上一页
      </Button>
      <span>{page} / {totalPages}</span>
      <Button
        className="h-8 min-w-16 px-3"
        isDisabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        variant="outline"
      >
        下一页
      </Button>
    </nav>
  );
}
