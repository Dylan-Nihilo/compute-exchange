"use client";

import {Button, Modal} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {ZodError} from "zod";
import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {fetchAdminGpuCatalog, gpuModelFromForm, saveAdminGpuModel, type AdminGpuModel, type GpuCatalogFilter, type GpuModelInput} from "@/lib/admin-gpu-catalog";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";
import {AdminPage, AdminPanel, AdminTableHead, AdminTableShell, adminTableClass} from "./admin-ui";

const inputClass = "min-h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";

export function AdminGpuCatalog() {
  const [filter, setFilter] = useState<GpuCatalogFilter>({});
  const [editing, setEditing] = useState<AdminGpuModel | null | undefined>(undefined);
  const query = useQuery({queryKey: ["admin", "gpu-catalog", filter], queryFn: ({signal}) => fetchAdminGpuCatalog(filter, fetch, signal)});
  return <AdminPage title="GPU 型号库" eyebrow="GPU catalog" description="维护可供发布选择的型号、规格及来源。" actions={<Button onPress={() => setEditing(null)}>新增型号</Button>}>
    <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_160px_auto]" onSubmit={(event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget); setFilter(Object.fromEntries(["q", "vendor", "origin", "grade"].map((key) => [key, String(data.get(key) ?? "")])));
    }}>
      <label className="grid gap-2 text-sm">型号名称<input aria-label="型号名称筛选" className={inputClass} name="q" placeholder="搜索型号" /></label>
      <label className="grid gap-2 text-sm">厂商<input aria-label="厂商筛选" className={inputClass} name="vendor" placeholder="填写完整厂商名称" /></label>
      <label className="grid gap-2 text-sm">产地<select aria-label="产地筛选" className={inputClass} name="origin"><option value="">全部产地</option><option value="domestic">国产</option><option value="international">海外</option></select></label>
      <label className="grid gap-2 text-sm">级别<select aria-label="级别筛选" className={inputClass} name="grade"><option value="">全部级别</option><option value="datacenter">数据中心</option><option value="consumer">消费级</option></select></label>
      <Button className="self-end" type="submit" variant="outline">筛选</Button>
    </form>
    <AdminPanel className="overflow-hidden p-3 sm:p-4">
      <AdminTableShell isLoading={query.isPending} error={query.isError ? messageFor(query.error) : undefined} onRetry={() => void query.refetch()} emptyTitle="暂无型号" emptyDescription="调整筛选条件，或新增需要的型号。">
        {query.data?.items.length ? <table className={adminTableClass}>
          <caption className="sr-only">GPU 型号维护列表</caption><AdminTableHead><th scope="col">型号与厂商</th><th scope="col">分类</th><th scope="col">规格</th><th scope="col">来源</th><th scope="col">状态</th><th scope="col">权重</th><th scope="col">更新时间</th><th scope="col">操作</th></AdminTableHead>
          <tbody>{query.data.items.map((model) => <tr key={model.id}>
            <th scope="row" className="max-w-60 whitespace-pre-wrap break-words font-medium"><span className="block">{model.model_name}</span><span className="mt-1 block text-xs font-normal text-muted">{model.vendor}</span></th>
            <td>{model.origin === "domestic" ? "国产" : "海外"}<br />{model.grade === "datacenter" ? "数据中心" : "消费级"}</td>
            <td className="min-w-44"><span className="block">{model.vram_gb === null ? "显存待核实" : `${model.vram_gb} GB ${model.vram_type ?? ""}`}</span><span className="block">{model.fp16_tflops === null ? "FP16 待核实" : `${model.fp16_tflops} TFLOPS`}</span>{model.interconnect ? <span className="block">{model.interconnect}</span> : null}{model.secure_certified ? <span className="block text-xs text-success">安可认证</span> : null}</td>
            <td className="max-w-64 whitespace-pre-wrap break-words">{model.spec_source || "未填写"}</td><td>{model.status === "enabled" ? "已启用" : "已停用"}</td><td>{model.sort_weight}</td><td>{formatDateTime(model.updated_at)}</td>
            <td><Button size="sm" variant="tertiary" onPress={() => setEditing(model)}>编辑型号</Button></td>
          </tr>)}</tbody>
        </table> : null}
      </AdminTableShell>
    </AdminPanel>
    {query.data ? <p className="text-sm text-muted">共 {query.data.total} 款型号，包含已停用条目。</p> : null}
    {editing !== undefined ? <GpuModelEditor key={editing?.id ?? "new"} model={editing} onClose={() => setEditing(undefined)} /> : null}
  </AdminPage>;
}

function GpuModelEditor({model, onClose}: {model: AdminGpuModel | null; onClose: () => void}) {
  const client = useQueryClient();
  const [confirmation, setConfirmation] = useState<GpuModelInput | null>(null);
  const mutation = useMutation({
    mutationFn: (input: GpuModelInput) => saveAdminGpuModel(model?.id ?? null, input),
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({queryKey: ["admin", "gpu-catalog"]}), client.invalidateQueries({queryKey: ["gpu-catalog"]})]);
      onClose(); notify.success("型号已保存");
    },
    onError: (error) => {setConfirmation(null); notify.error(messageFor(error));},
  });
  return <>
    <Modal.Backdrop isOpen isKeyboardDismissDisabled={mutation.isPending} onOpenChange={(open) => {if (!open && !mutation.isPending) onClose();}}>
      <Modal.Container size="lg" scroll="inside"><Modal.Dialog>
        <Modal.Header><Modal.Heading>{model ? "编辑型号" : "新增型号"}</Modal.Heading><p className="text-sm leading-6 text-muted">规格未经核实时请留空。新增型号保存后即可供发布选择。</p></Modal.Header>
        <Modal.Body>
          <form id="gpu-model-form" onSubmit={(event) => {
            event.preventDefault(); if (mutation.isPending) return;
            let input: GpuModelInput;
            try {input = gpuModelFromForm(new FormData(event.currentTarget));} catch {notify.error("请补齐必填信息，并填写有效的规格数值。"); return;}
            if (model && (input.model_name !== model.model_name || (model.status === "enabled" && input.status === "disabled"))) setConfirmation(input);
            else mutation.mutate(input);
          }}>
            <fieldset disabled={mutation.isPending} className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">厂商名称<input className={inputClass} name="vendor" maxLength={32} required defaultValue={model?.vendor} /></label>
              <label className="grid gap-2 text-sm">标准型号名称<input className={inputClass} name="model_name" maxLength={64} required defaultValue={model?.model_name} /></label>
              <fieldset className="space-y-2 text-sm"><legend>产地</legend><div className="flex gap-5">{[["domestic", "国产"], ["international", "海外"]].map(([value, label]) => <label className="flex min-h-10 items-center gap-2" key={value}><input type="radio" name="origin" value={value} required defaultChecked={model?.origin === value} />{label}</label>)}</div></fieldset>
              <fieldset className="space-y-2 text-sm"><legend>级别</legend><div className="flex gap-5">{[["datacenter", "数据中心"], ["consumer", "消费级"]].map(([value, label]) => <label className="flex min-h-10 items-center gap-2" key={value}><input type="radio" name="grade" value={value} required defaultChecked={model?.grade === value} />{label}</label>)}</div></fieldset>
              <label className="grid gap-2 text-sm">单卡显存（GB）<input className={inputClass} name="vram_gb" type="number" min={1} max={2147483647} step={1} defaultValue={model?.vram_gb ?? ""} /></label>
              <label className="grid gap-2 text-sm">显存类型<input className={inputClass} name="vram_type" maxLength={16} defaultValue={model?.vram_type ?? ""} placeholder="如 HBM3" /></label>
              <label className="grid gap-2 text-sm">FP16 稠密 Tensor（TFLOPS）<input className={inputClass} name="fp16_tflops" type="number" min={0.1} max={9999999.9} step={0.1} defaultValue={model?.fp16_tflops ?? ""} /></label>
              <label className="grid gap-2 text-sm">互联方式<input className={inputClass} name="interconnect" maxLength={32} defaultValue={model?.interconnect ?? ""} /></label>
              <label className="grid gap-2 text-sm sm:col-span-2">规格或认证来源<input className={inputClass} name="spec_source" maxLength={255} defaultValue={model?.spec_source ?? ""} placeholder="厂商规格页或认证目录出处" /></label>
              <label className="grid gap-2 text-sm">排序权重<input className={inputClass} name="sort_weight" type="number" min={-2147483648} max={2147483647} step={1} defaultValue={model?.sort_weight ?? 0} /><span className="text-xs text-muted">数值越大，显示越靠前。</span></label>
              <div className="space-y-2 text-sm"><label className="flex min-h-10 items-center gap-2"><input type="checkbox" name="secure_certified" defaultChecked={model?.secure_certified ?? false} />已列入安可认证目录</label>{model ? <label className="flex min-h-10 items-center gap-2"><input type="checkbox" name="enabled" defaultChecked={model.status === "enabled"} />启用该型号</label> : <input type="hidden" name="enabled" value="on" />}</div>
            </fieldset>
          </form>
        </Modal.Body>
        <Modal.Footer><Button variant="tertiary" isDisabled={mutation.isPending} onPress={onClose}>取消</Button><Button type="submit" form="gpu-model-form" isDisabled={mutation.isPending} isPending={mutation.isPending}>保存型号</Button></Modal.Footer>
      </Modal.Dialog></Modal.Container>
    </Modal.Backdrop>
    <ConfirmDialog open={confirmation !== null} title="确认型号变更" confirmLabel="保存变更" isPending={mutation.isPending} isDestructive={confirmation?.status === "disabled"}
      description={confirmation ? `${model?.model_name !== confirmation.model_name ? `型号名称将改为「${confirmation.model_name}」，已发布商品仍保留原型号名称。` : ""}${confirmation.status === "disabled" ? "停用后将从发布选择器隐藏，已发布商品和历史订单保持不变。" : ""}` : ""}
      onCancel={() => setConfirmation(null)} onConfirm={() => {if (confirmation) mutation.mutate(confirmation);}} />
  </>;
}

function messageFor(error: unknown) {
  if (error instanceof ZodError) return "型号服务返回格式错误，请重试。";
  if (error instanceof TypeError || (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name))) return "型号服务暂时不可用，请重试。";
  return error instanceof Error ? error.message : "型号操作未完成";
}
