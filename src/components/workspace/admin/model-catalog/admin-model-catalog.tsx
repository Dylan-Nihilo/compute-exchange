"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {OptionChips} from "@/components/managed/option-chips";
import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {changeCatalogStatus, fetchAdminCatalog, type AdminCatalogEntry} from "@/lib/admin-model-catalog";
import {notify} from "@/lib/notify";

import {AdminPage, AdminPanel, AdminTableShell} from "../admin-ui";
import {CatalogEditor} from "./catalog-editor";
import {catalogKeys} from "./catalog-keys";
import {CatalogTable, type CatalogAction} from "./catalog-table";
import {VerificationPanel} from "./verification-panel";

type StatusTab = "all" | "draft" | "active" | "retired";
type Pending = {entry: AdminCatalogEntry; action: "activate" | "retire"};

/** Operator model catalogue (docs/27 §27.8 运营). */
export function AdminModelCatalog() {
  const client = useQueryClient();
  const [tab, setTab] = useState<StatusTab>("all");
  const [editing, setEditing] = useState<number | null | undefined>(undefined);
  const [verifying, setVerifying] = useState<AdminCatalogEntry | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const query = useQuery({queryKey: catalogKeys.list(), queryFn: () => fetchAdminCatalog(), retry: false});
  const transition = useMutation({
    mutationFn: ({entry, action}: Pending) => changeCatalogStatus(entry.id, action),
    onSuccess: async (_data, {action}) => {
      setPending(null);
      notify.success(action === "activate" ? "条目已上线，买家可在模型列表中选择" : "条目已退役，运行中的部署不受影响");
      await client.invalidateQueries({queryKey: catalogKeys.all});
    },
    // 40001 (no pass verification) and other rejections are shown as returned.
    onError: (error) => notify.error(error.message),
  });
  const entries = (query.data?.list ?? []).filter((entry) => tab === "all" || entry.status === tab);

  const onAction = (entry: AdminCatalogEntry, action: CatalogAction) => {
    if (action === "edit") setEditing(entry.id);
    else if (action === "verify") setVerifying(entry);
    else setPending({entry, action});
  };

  return (
    <AdminPage
      actions={<Button onPress={() => setEditing(null)}>新建条目</Button>}
      description="维护可一键部署的模型。条目经真机验证通过后上线，买家只能看到已上线条目。"
      eyebrow="Model catalog"
      title="模型目录"
    >
      <OptionChips
        items={[
          {value: "all", label: "全部"},
          {value: "draft", label: "草稿"},
          {value: "active", label: "已上线"},
          {value: "retired", label: "已退役"},
        ]}
        label="状态"
        value={tab}
        onChange={setTab}
      />
      <AdminPanel className="overflow-hidden p-3 sm:p-4">
        <AdminTableShell
          emptyDescription={tab === "all" ? "新建条目并录入真机验证记录后即可上线。" : "当前筛选下没有条目。"}
          emptyTitle="暂无模型条目"
          error={query.isError ? query.error.message : undefined}
          isLoading={query.isPending}
          onRetry={() => void query.refetch()}
        >
          {entries.length ? <CatalogTable entries={entries} onAction={onAction} /> : null}
        </AdminTableShell>
      </AdminPanel>
      {editing !== undefined ? <CatalogEditor entryId={editing} key={editing ?? "new"} onClose={() => setEditing(undefined)} /> : null}
      {verifying ? <VerificationPanel entry={verifying} key={verifying.id} onClose={() => setVerifying(null)} /> : null}
      <ConfirmDialog
        confirmLabel={pending?.action === "retire" ? "确认退役" : "确认上线"}
        description={
          pending?.action === "retire"
            ? `退役后「${pending.entry.display_name}」不再出现在买家模型列表，运行中的部署不受影响。`
            : `上线后买家即可选择「${pending?.entry.display_name ?? ""}」部署。上线须至少一条真机验证通过记录。`
        }
        isDestructive={pending?.action === "retire"}
        isPending={transition.isPending}
        open={pending !== null}
        title={pending?.action === "retire" ? "退役模型条目" : "上线模型条目"}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) transition.mutate(pending);
        }}
      />
    </AdminPage>
  );
}
