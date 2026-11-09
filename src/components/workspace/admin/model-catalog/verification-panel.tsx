"use client";

import {Button, Modal} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {addVerification, fetchAdminCatalogEntry, type AdminCatalogEntry, type VerificationInput, verificationFromForm} from "@/lib/admin-model-catalog";
import {formatBytes} from "@/lib/managed-orders";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";

import {catalogInputClass} from "./catalog-fields";
import {catalogKeys} from "./catalog-keys";

/** Real-hardware verification records for one entry (docs/27 §27.2: activation needs ≥1 pass). */
export function VerificationPanel({entry, onClose}: {entry: AdminCatalogEntry; onClose: () => void}) {
  const detail = useQuery({queryKey: catalogKeys.detail(entry.id), queryFn: () => fetchAdminCatalogEntry(entry.id), retry: false});
  const records = detail.data?.verifications;

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Container scroll="inside" size="lg">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>真机验证 · {entry.display_name}</Modal.Heading>
            <p className="text-sm leading-6 text-muted">在真实卡型上部署并跑通后录入。上线前至少需要一条通过记录；买家选择未验证过的卡型时须单独确认。</p>
          </Modal.Header>
          <Modal.Body className="space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-semibold">已录入记录</h3>
              {detail.isPending ? <p className="text-sm text-muted">正在读取…</p> : null}
              {detail.isError ? <p className="text-sm text-danger" role="alert">{detail.error.message}</p> : null}
              {records && records.length === 0 ? <p className="text-sm text-muted">尚无验证记录。</p> : null}
              {records && records.length > 0 ? (
                <ul className="divide-y divide-border text-sm">
                  {records.map((record) => (
                    <li className="py-2" key={record.id}>
                      <span className={record.result === "pass" ? "text-success" : "text-danger"}>{record.result === "pass" ? "通过" : "未通过"}</span>
                      {` · ${record.gpu_model} × ${record.cards} 卡 · TP ${record.tp} · 上下文 ${record.max_model_len.toLocaleString("zh-CN")}`}
                      {record.measured_overhead_bytes != null ? ` · 实测开销 ${formatBytes(record.measured_overhead_bytes)}` : ""}
                      <span className="block text-xs text-muted">{formatDateTime(record.tested_at)}{record.notes ? ` · ${record.notes}` : ""}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
            <VerificationForm modelId={entry.id} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>关闭</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function VerificationForm({modelId}: {modelId: number}) {
  const client = useQueryClient();
  const [localError, setLocalError] = useState("");
  const [formKey, setFormKey] = useState(0);
  const add = useMutation({
    mutationFn: (input: VerificationInput) => addVerification(modelId, input),
    onSuccess: async () => {
      notify.success("验证记录已录入");
      setFormKey((key) => key + 1);
      await client.invalidateQueries({queryKey: catalogKeys.all});
    },
  });

  return (
    <form
      className="space-y-3"
      key={formKey}
      onSubmit={(event) => {
        event.preventDefault();
        if (add.isPending) return;
        const parsed = verificationFromForm(new FormData(event.currentTarget));
        if (!parsed.success) {
          setLocalError(parsed.error.issues[0]?.message ?? "请检查填写内容");
          return;
        }
        setLocalError("");
        add.mutate(parsed.data);
      }}
    >
      <h3 className="text-sm font-semibold">录入新记录</h3>
      <fieldset className="grid gap-3 sm:grid-cols-2" disabled={add.isPending}>
        <label className="grid gap-2 text-sm">卡型<input className={catalogInputClass} maxLength={64} name="gpu_model" placeholder="GPU 型号库中的标准型号名" required /></label>
        <label className="grid gap-2 text-sm">卡数<input className={catalogInputClass} min={1} name="cards" required step={1} type="number" /></label>
        <label className="grid gap-2 text-sm">TP（须属于条目允许的 TP，且不大于卡数）<input className={catalogInputClass} min={1} name="tp" required step={1} type="number" /></label>
        <label className="grid gap-2 text-sm">上下文<input className={catalogInputClass} min={1} name="max_model_len" required step={1} type="number" /></label>
        <label className="grid gap-2 text-sm">实测运行时开销（字节，选填）<input className={catalogInputClass} min={1} name="measured_overhead_bytes" step={1} type="number" /></label>
        <label className="grid gap-2 text-sm">测试时间<input className={catalogInputClass} name="tested_at" required type="datetime-local" /></label>
        <fieldset className="text-sm">
          <legend className="mb-2">结果</legend>
          <div className="flex gap-5">
            <label className="flex min-h-10 items-center gap-2"><input name="result" required type="radio" value="pass" />通过</label>
            <label className="flex min-h-10 items-center gap-2"><input name="result" type="radio" value="fail" />未通过</label>
          </div>
        </fieldset>
        <label className="grid gap-2 text-sm">备注（选填）<input className={catalogInputClass} maxLength={512} name="notes" /></label>
      </fieldset>
      {localError ? <p className="text-sm text-danger" role="alert">{localError}</p> : null}
      {add.isError ? <p className="text-sm text-danger" role="alert">{add.error.message}</p> : null}
      <Button isPending={add.isPending} type="submit" variant="outline">录入记录</Button>
    </form>
  );
}
