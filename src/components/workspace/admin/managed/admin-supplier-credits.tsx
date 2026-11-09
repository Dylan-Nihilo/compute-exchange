"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {ListPagination} from "@/components/workspace/ui/list-pagination";
import {ADMIN_PAGE_SIZE} from "@/lib/admin-managed";
import {
  creditOverrideCopy,
  creditOverrideModes,
  fetchSupplierCredit,
  fetchSupplierCredits,
  overrideSupplierCredit,
  type CreditDetail,
  type CreditOverrideMode,
} from "@/lib/admin-outages";
import {formatDateTime} from "@/lib/format/date";
import {formatMinutes} from "@/lib/managed-orders";

import {AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "../admin-ui";
import {adminInputClass} from "./admin-lease-table";

/** GET /admin/supplier-credits (lowest score first) with detail + override for one supplier (T-105). */
export function AdminSupplierCredits() {
  const [filter, setFilter] = useState<{stopped: boolean; page: number}>({stopped: false, page: 1});
  const [selected, setSelected] = useState<number | null>(null);
  const query = useQuery({queryKey: ["admin", "supplier-credits", filter], queryFn: () => fetchSupplierCredits(filter), retry: false});
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / ADMIN_PAGE_SIZE));

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input checked={filter.stopped} type="checkbox" onChange={(event) => setFilter({stopped: event.target.checked, page: 1})} />
        仅看已停调度
      </label>
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell
          emptyDescription="仅有托管节点的供给方会出现在这里。"
          emptyTitle="暂无信用记录"
          error={query.isError ? query.error.message : undefined}
          isLoading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {query.data?.list.length ? (
            <table className={adminTableClass}>
              <caption className="sr-only">供给方信用分</caption>
              <AdminTableHead>
                <th scope="col">供给方</th><th scope="col">信用分</th><th scope="col">30 天停机</th><th scope="col">探活失败 / 违约</th>
                <th scope="col">调度</th><th scope="col">覆盖</th><th scope="col">计算时间</th><th scope="col">操作</th>
              </AdminTableHead>
              <tbody>
                {query.data.list.map((row) => (
                  <tr key={row.supplier_id}>
                    <th scope="row">#{row.supplier_id}</th>
                    <td className="font-medium">{row.score}</td>
                    <td className="text-xs">{formatMinutes(row.outage_minutes_30d)} · {row.outage_count_30d} 次</td>
                    <td className="text-xs">{row.probe_failures_30d} / {row.defaults_30d}</td>
                    <td className={row.dispatch_stopped ? "text-xs text-danger" : "text-xs"}>{row.dispatch_stopped ? "已停调度" : "正常接单"}</td>
                    <td className="text-xs">{creditOverrideCopy[row.override_mode]}</td>
                    <td className="text-xs">{row.computed_at ? formatDateTime(row.computed_at) : "—"}</td>
                    <td><Button size="sm" variant="tertiary" onPress={() => setSelected(row.supplier_id)}>详情</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </AdminTableShell>
      </AdminPanel>
      {pages > 1 ? <ListPagination page={filter.page} totalPages={pages} onPageChange={(page) => setFilter({...filter, page})} /> : null}
      {selected ? <CreditDetailPanel key={selected} supplierId={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function CreditDetailPanel({supplierId, onClose}: {supplierId: number; onClose: () => void}) {
  const client = useQueryClient();
  const key = ["admin", "supplier-credit", supplierId] as const;
  const query = useQuery({queryKey: key, queryFn: () => fetchSupplierCredit(supplierId), retry: false});
  return (
    <AdminPanel className="space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">供给方 #{supplierId} 信用详情</p>
        <Button size="sm" variant="ghost" onPress={onClose}>收起</Button>
      </div>
      {query.isPending ? <p className="text-sm text-muted">正在重算并读取…</p> : null}
      {query.isError ? <p className="text-sm text-danger" role="alert">{query.error.message}</p> : null}
      {query.data ? (
        <CreditDetailBody
          detail={query.data}
          onSaved={(next) => {
            client.setQueryData(key, next);
            void client.invalidateQueries({queryKey: ["admin", "supplier-credits"]});
          }}
          supplierId={supplierId}
        />
      ) : null}
    </AdminPanel>
  );
}

function CreditDetailBody({detail, supplierId, onSaved}: {detail: CreditDetail; supplierId: number; onSaved: (next: CreditDetail) => void}) {
  const [mode, setMode] = useState<CreditOverrideMode>(detail.override_mode);
  const [reason, setReason] = useState("");
  const mutation = useMutation({mutationFn: () => overrideSupplierCredit(supplierId, mode, reason), onSuccess: (next) => { setReason(""); onSaved(next); }});
  return (
    <div className="space-y-4">
      <p className="text-sm">
        信用分 <strong>{detail.score}</strong>（低于 {detail.stop_below} 停调度）·{" "}
        <span className={detail.dispatch_stopped ? "text-danger" : ""}>{detail.dispatch_stopped ? "已停调度" : "正常接单"}</span> · 覆盖：{creditOverrideCopy[detail.override_mode]}
        {detail.override_reason ? <span className="block text-xs text-muted">覆盖理由：{detail.override_reason}{detail.override_at ? `（${formatDateTime(detail.override_at)}）` : ""}</span> : null}
      </p>
      {detail.nodes.length ? (
        <table className={adminTableClass}>
          <caption className="sr-only">托管节点调度状态</caption>
          <AdminTableHead>
            <th scope="col">节点</th><th scope="col">平台停调度</th><th scope="col">供给方排空</th><th scope="col">30 天停机</th>
          </AdminTableHead>
          <tbody>
            {detail.nodes.map((node) => (
              <tr key={node.id}>
                <th scope="row">{node.node_name} <span className="text-xs text-muted">#{node.id}</span></th>
                <td className="text-xs">
                  {node.dispatch_hold ? <span className="text-danger">暂停接单{node.dispatch_hold_reason ? `：${node.dispatch_hold_reason}` : ""}</span> : "—"}
                  {node.dispatch_hold_at ? <span className="block text-muted">{formatDateTime(node.dispatch_hold_at)}</span> : null}
                </td>
                <td className="text-xs">{node.schedulable ? "—" : "已排空"}</td>
                <td className="text-xs">{formatMinutes(node.outage_minutes_30d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-sm text-muted">该供给方暂无托管节点。</p>}
      <form
        className="grid gap-3 sm:grid-cols-[180px_1fr_auto]"
        onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}
      >
        <select aria-label="覆盖方式" className={adminInputClass} value={mode} onChange={(event) => setMode(event.target.value as CreditOverrideMode)}>
          {creditOverrideModes.map((value) => <option key={value} value={value}>{creditOverrideCopy[value]}</option>)}
        </select>
        <input
          aria-label="覆盖理由"
          className={adminInputClass}
          maxLength={254}
          placeholder={mode === "auto" ? "理由（可选）" : "理由（必填）"}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Button isPending={mutation.isPending} type="submit" variant="outline">保存覆盖</Button>
      </form>
      <p className="text-xs text-muted">强制放行后再发生计入的供给方责任停机会自动回到「按分数自动」；强制停调度不影响已在租的租约。</p>
      {mutation.isError ? <p className="text-sm text-danger" role="alert">{mutation.error.message}</p> : null}
      {mutation.isSuccess ? <p className="text-sm" role="status">已保存并重算。</p> : null}
    </div>
  );
}
