"use client";

import {Chip} from "@heroui/react";
import {
  DataGrid,
  type DataGridColumn,
} from "@heroui-pro/react/data-grid";
import {EmptyState} from "@heroui-pro/react/empty-state";

export type MarketSupply = {
  id: string;
  name: string;
  location: string;
  capacity: string;
  delivery: string;
  network: string;
  price: string;
};

const columns: DataGridColumn<MarketSupply>[] = [
  {
    id: "name",
    header: "算力资源",
    isRowHeader: true,
    width: "2fr",
    minWidth: 260,
    cell: (supply) => (
      <div>
        <p className="font-semibold text-foreground">{supply.name}</p>
        <p className="mt-1 text-sm text-muted">{supply.location}</p>
      </div>
    ),
  },
  {
    id: "capacity",
    header: "可用规模",
    accessorKey: "capacity",
    minWidth: 120,
  },
  {
    id: "delivery",
    header: "交付方式",
    minWidth: 130,
    cell: (supply) => (
      <Chip color="default" size="sm" variant="soft">
        {supply.delivery}
      </Chip>
    ),
  },
  {
    id: "network",
    header: "网络带宽",
    accessorKey: "network",
    minWidth: 120,
  },
  {
    id: "price",
    header: "参考单价",
    align: "end",
    minWidth: 150,
    cell: (supply) => (
      <div className="text-right">
        <p className="font-semibold tabular-nums text-foreground">{supply.price}</p>
        <p className="mt-1 text-xs text-muted">每 GPU·小时</p>
      </div>
    ),
  },
];

export function MarketBrowser({supplies}: {supplies: readonly MarketSupply[]}) {
  return (
    <DataGrid
      aria-label="可用算力供给"
      className="mt-6 rounded-2xl border border-border bg-surface"
      columns={columns}
      contentClassName="min-w-[840px]"
      data={[...supplies]}
      getRowId={(supply) => supply.id}
      renderEmptyState={() => (
        <EmptyState className="py-14" size="lg">
          <EmptyState.Header>
            <EmptyState.Title>暂无匹配供给</EmptyState.Title>
            <EmptyState.Description>
              请尝试 GPU 型号、城市或交付方式。
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      )}
      scrollContainerClassName="overflow-x-auto"
      variant="secondary"
    />
  );
}
