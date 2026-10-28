"use client";

import {Button, Modal} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {catalogEntryFromForm, fetchAdminCatalogEntry, saveCatalogEntry, type AdminCatalogEntry, type CatalogEntryInput} from "@/lib/admin-model-catalog";
import {notify} from "@/lib/notify";

import {CatalogEngineFields, CatalogSourceFields} from "./catalog-fields";
import {catalogKeys} from "./catalog-keys";

/** Create a draft entry (entryId null) or edit an existing draft. The full row is re-read before editing. */
export function CatalogEditor({entryId, onClose}: {entryId: number | null; onClose: () => void}) {
  const detail = useQuery({
    queryKey: catalogKeys.detail(entryId ?? 0),
    queryFn: () => fetchAdminCatalogEntry(entryId ?? 0),
    enabled: entryId !== null,
    retry: false,
  });
  const entry = entryId === null ? null : (detail.data ?? null);
  const notDraft = entry !== null && entry.status !== "draft";

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container scroll="inside" size="lg">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>{entryId === null ? "新建模型条目" : "编辑草稿条目"}</Modal.Heading>
            <p className="text-sm leading-6 text-muted">只有草稿可编辑；已上线条目的任何修改（含 revision 变化）须新建条目。新条目保存为草稿，录入真机验证通过记录后方可上线。</p>
          </Modal.Header>
          <Modal.Body>
            {entryId !== null && detail.isPending ? <p className="text-sm text-muted">正在读取条目…</p> : null}
            {detail.isError ? <p className="text-sm text-danger" role="alert">{detail.error.message}</p> : null}
            {notDraft ? <p className="text-sm text-warning" role="alert">该条目已不是草稿，不能编辑。</p> : null}
            {entryId === null || (entry && !notDraft) ? <EditorForm entry={entry} onSaved={onClose} /> : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>取消</Button>
            <Button form="model-catalog-form" isDisabled={notDraft || (entryId !== null && !entry)} type="submit">保存草稿</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function EditorForm({entry, onSaved}: {entry: AdminCatalogEntry | null; onSaved: () => void}) {
  const client = useQueryClient();
  const [localError, setLocalError] = useState("");
  const save = useMutation({
    mutationFn: (input: CatalogEntryInput) => saveCatalogEntry(entry?.id ?? null, input),
    onSuccess: async () => {
      await client.invalidateQueries({queryKey: catalogKeys.all});
      notify.success(entry ? "草稿已保存" : "条目已创建为草稿");
      onSaved();
    },
  });

  return (
    <form
      id="model-catalog-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (save.isPending) return;
        const parsed = catalogEntryFromForm(new FormData(event.currentTarget));
        if (!parsed.success) {
          setLocalError(parsed.error.issues[0]?.message ?? "请检查填写内容");
          return;
        }
        setLocalError("");
        save.mutate(parsed.data);
      }}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2" disabled={save.isPending}>
        <CatalogSourceFields entry={entry} />
        <CatalogEngineFields entry={entry} />
      </fieldset>
      {localError ? <p className="mt-4 text-sm text-danger" role="alert">{localError}</p> : null}
      {save.isError ? <p className="mt-4 text-sm text-danger" role="alert">{save.error.message}</p> : null}
    </form>
  );
}
