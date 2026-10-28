"use client";

import {Button} from "@heroui/react";

import {catalogStatusCopy, commercialUseCopy, type AdminCatalogEntry} from "@/lib/admin-model-catalog";
import {formatDateTime} from "@/lib/format/date";
import {formatBytes} from "@/lib/managed-orders";

import {AdminTableHead, adminTableClass} from "../admin-ui";

export type CatalogAction = "edit" | "verify" | "activate" | "retire";

const STATUS_TONE: Record<string, string> = {draft: "text-warning", active: "text-success", retired: "text-muted"};

export function CatalogTable({entries, onAction}: {entries: readonly AdminCatalogEntry[]; onAction: (entry: AdminCatalogEntry, action: CatalogAction) => void}) {
  return (
    <table className={adminTableClass}>
      <caption className="sr-only">模型目录</caption>
      <AdminTableHead>
        <th scope="col">模型</th><th scope="col">来源</th><th scope="col">规格</th><th scope="col">引擎要求</th>
        <th scope="col">许可</th><th scope="col">状态</th><th scope="col">操作</th>
      </AdminTableHead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <th className="max-w-56 font-medium break-words" scope="row">
              {entry.display_name}
              <span className="mt-1 block font-mono text-xs font-normal text-muted">{entry.model_key}</span>
            </th>
            <td className="max-w-56 font-mono text-xs break-all">
              {entry.repo}
              <span className="block text-muted">@{entry.revision.slice(0, 12)}</span>
            </td>
            <td className="text-xs">
              {entry.quant} · {formatBytes(entry.weights_bytes)}
              <span className="block text-muted">TP {entry.valid_tp} · 上下文 {entry.min_context_tokens.toLocaleString("zh-CN")}–{entry.max_model_len.toLocaleString("zh-CN")}</span>
            </td>
            <td className="text-xs">
              计算能力 ≥ {entry.min_compute_capability}
              <span className="block text-muted">驱动 ≥ {entry.min_driver_version}</span>
            </td>
            <td className="text-xs">
              {entry.license}
              <span className={`block ${entry.commercial_use === "restricted" ? "text-warning" : "text-muted"}`}>{commercialUseCopy[entry.commercial_use]}</span>
            </td>
            <td className="text-xs">
              <span className={STATUS_TONE[entry.status]}>{catalogStatusCopy[entry.status]}</span>
              {entry.updated_at ? <span className="block text-muted">{formatDateTime(entry.updated_at)}</span> : null}
            </td>
            <td>
              <div className="flex flex-wrap gap-2">
                {entry.status === "draft" ? <Button size="sm" variant="tertiary" onPress={() => onAction(entry, "edit")}>编辑</Button> : null}
                <Button size="sm" variant="tertiary" onPress={() => onAction(entry, "verify")}>验证记录</Button>
                {entry.status === "draft" ? <Button size="sm" variant="outline" onPress={() => onAction(entry, "activate")}>上线</Button> : null}
                {entry.status === "active" ? <Button size="sm" variant="danger-soft" onPress={() => onAction(entry, "retire")}>退役</Button> : null}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
