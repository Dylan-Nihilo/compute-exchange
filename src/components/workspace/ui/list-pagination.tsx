import {Button} from "@heroui/react";
import {ChevronLeft, ChevronRight} from "lucide";

import {InteractiveIcon} from "@/components/system/interactive-icon";

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
        className="group h-8 min-w-20 px-3"
        isDisabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        variant="outline"
      >
        <InteractiveIcon
          className="transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-x-0.5"
          icon={ChevronLeft}
          size={14}
        />
        上一页
      </Button>
      <span>{page} / {totalPages}</span>
      <Button
        className="group h-8 min-w-20 px-3"
        isDisabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        variant="outline"
      >
        下一页
        <InteractiveIcon
          className="transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5"
          icon={ChevronRight}
          size={14}
        />
      </Button>
    </nav>
  );
}
