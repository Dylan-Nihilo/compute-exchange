"use client";

import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  Skeleton,
  TextField,
} from "@heroui/react";
import {ErrorState} from "@/components/system/operation-state";
import {TicketCard} from "@/components/workspace/tickets/ticket-card";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import type {BuyerTicket, TicketStatus} from "@/lib/buyer-tickets";

type StatusFilter = "all" | TicketStatus;

const statusOptions: readonly {id: StatusFilter; label: string}[] = [
  {id: "all", label: "全部状态"},
  {id: "pending", label: "待处理"},
  {id: "processing", label: "处理中"},
  {id: "resolved", label: "已完结"},
  {id: "closed", label: "已关闭"},
];

export type BuyerTicketsViewProps = {
  error?: string | null;
  isLoading?: boolean;
  isRetrying?: boolean;
  keyword: string;
  page: number;
  status: StatusFilter;
  tickets: readonly BuyerTicket[];
  totalPages: number;
  onCreate: () => void;
  onKeywordChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onStatusChange: (status: StatusFilter) => void;
  onViewDetail: (ticketNo: string) => void;
};

export function BuyerTicketsView({
  error = null,
  isLoading = false,
  isRetrying = false,
  keyword,
  page,
  status,
  tickets,
  totalPages,
  onCreate,
  onKeywordChange,
  onPageChange,
  onRetry,
  onStatusChange,
  onViewDetail,
}: BuyerTicketsViewProps) {
  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader
        actions={
          <Button
            className="h-10 min-w-28 rounded-xl bg-[#c9f556] px-5 text-sm font-semibold text-[#173447] transition-colors hover:bg-[#b8e643]"
            onPress={onCreate}
          >
            提交工单
          </Button>
        }
        title="工单售后"
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Label className="mb-2 block text-[13px] font-medium text-[#24495d]">状态</Label>
          <Select
            aria-label="按状态筛选工单"
            value={status}
            variant="secondary"
            onChange={(value) => onStatusChange(value as StatusFilter)}
          >
            <Select.Trigger className="h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d]">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {statusOptions.map((option) => (
                  <ListBox.Item id={option.id} key={option.id} textValue={option.label}>
                    {option.label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <TextField
          fullWidth
          aria-label="搜索工单号或标题"
          className="max-w-sm gap-2"
          value={keyword}
          variant="secondary"
          onChange={onKeywordChange}
        >
          <Label className="text-[13px] leading-5 font-medium text-[#24495d]">搜索</Label>
          <Input
            autoComplete="off"
            className="h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba]"
            placeholder="搜索工单号/标题"
          />
        </TextField>
      </div>

      <div aria-busy={isLoading} className="min-h-[380px]">
        {isLoading ? (
          <TicketListSkeleton />
        ) : error ? (
          <div className="grid min-h-[380px] place-items-center">
            <ErrorState
              description={error}
              isPending={isRetrying}
              onRetry={onRetry}
              title="工单数据暂时不可用"
            />
          </div>
        ) : tickets.length ? (
          <ul className="space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket.ticket_no}>
                <TicketCard ticket={ticket} onViewDetail={onViewDetail} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="min-h-[380px] rounded-[20px] border border-[#afc4ce]/20 bg-white/60 backdrop-blur-xl">
            <EmptyState
              description="遇到订单或资源问题, 点击右上角「提交工单」, 平台运营会尽快介入处理。"
              title="暂无工单记录"
            />
          </div>
        )}
      </div>

      {!isLoading && !error ? (
        <ListPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      ) : null}
    </section>
  );
}

function TicketListSkeleton() {
  return (
    <div className="space-y-3">
      {["s1", "s2", "s3"].map((key) => (
        <Skeleton className="h-24 w-full rounded-[20px]" key={key} />
      ))}
    </div>
  );
}
