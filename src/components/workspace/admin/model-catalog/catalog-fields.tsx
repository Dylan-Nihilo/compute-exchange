import type {ReactNode} from "react";

import {catalogQuants, commercialUseCopy, engineArgWhitelist, jsonForEdit, metricsMapKeys, type AdminCatalogEntry} from "@/lib/admin-model-catalog";

export const catalogInputClass = "min-h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2";
const areaClass = `${catalogInputClass} min-h-28 py-2 font-mono text-xs`;

function Field({label, hint, wide, children}: {label: string; hint?: string; wide?: boolean; children: ReactNode}) {
  return (
    <label className={`grid gap-2 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

/** Identity, source and licence (docs/27 §27.2). Uncontrolled; read back via FormData. */
export function CatalogSourceFields({entry}: {entry: AdminCatalogEntry | null}) {
  return (
    <>
      <Field hint="2–64 位小写字母、数字、点、下划线或连字符，唯一，如 qwen3-32b-awq。" label="model_key">
        <input className={`${catalogInputClass} font-mono`} defaultValue={entry?.model_key} maxLength={64} name="model_key" required />
      </Field>
      <Field label="显示名称">
        <input className={catalogInputClass} defaultValue={entry?.display_name} maxLength={128} name="display_name" required />
      </Field>
      <Field hint="v1.2 仅支持 ModelScope。" label="ModelScope 仓库">
        <input className={`${catalogInputClass} font-mono`} defaultValue={entry?.repo} maxLength={255} name="repo" placeholder="组织/模型名" required />
      </Field>
      <Field hint="完整的固定提交号（40 或 64 位小写十六进制），不接受分支名或标签。" label="revision">
        <input className={`${catalogInputClass} font-mono`} defaultValue={entry?.revision} maxLength={64} name="revision" required />
      </Field>
      <Field hint={'JSON 数组：[{"path","size","sha256"}]（相对路径、sha256 为小写十六进制），拉取后逐文件校验；权重字节数不得超过清单总大小。'} label="文件清单 manifest" wide>
        <textarea className={areaClass} defaultValue={jsonForEdit(entry?.manifest)} name="manifest" required spellCheck={false} />
      </Field>
      <Field label="许可证">
        <input className={catalogInputClass} defaultValue={entry?.license} maxLength={64} name="license" placeholder="如 Apache-2.0" required />
      </Field>
      <Field hint="受限时买家部署前须单独确认许可条款。" label="商用许可">
        <select className={catalogInputClass} defaultValue={entry?.commercial_use ?? "unknown"} name="commercial_use">
          {Object.entries(commercialUseCopy).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
    </>
  );
}

/** Capacity inputs for the feasibility function plus engine settings (docs/27 §27.2–27.3). */
export function CatalogEngineFields({entry}: {entry: AdminCatalogEntry | null}) {
  return (
    <>
      <Field label="权重总字节数">
        <input className={catalogInputClass} defaultValue={entry?.weights_bytes} min={1} name="weights_bytes" required step={1} type="number" />
      </Field>
      <Field label="量化方式">
        <select className={catalogInputClass} defaultValue={entry?.quant ?? "bf16"} name="quant" required>
          {catalogQuants.map((quant) => <option key={quant} value={quant}>{quant}</option>)}
        </select>
      </Field>
      <Field hint="如 8.9；GPU 型号库中计算能力低于此值的卡型不可部署。" label="最低计算能力">
        <input className={catalogInputClass} defaultValue={entry?.min_compute_capability} maxLength={8} name="min_compute_capability" pattern="\d{1,2}\.\d" required />
      </Field>
      <Field hint="逗号分隔的 1–64 整数，如 1,2,4,8。" label="允许的 TP">
        <input className={`${catalogInputClass} font-mono`} defaultValue={entry?.valid_tp} maxLength={32} name="valid_tp" required />
      </Field>
      <Field label="每 token KV 字节数">
        <input className={catalogInputClass} defaultValue={entry?.kv_bytes_per_token} min={1} name="kv_bytes_per_token" required step={1} type="number" />
      </Field>
      <Field hint="取真机实测值，须大于 0。" label="运行时开销字节数">
        <input className={catalogInputClass} defaultValue={entry?.runtime_overhead_bytes} min={1} name="runtime_overhead_bytes" required step={1} type="number" />
      </Field>
      <div className="flex min-h-10 items-center text-sm sm:col-span-2">
        <label className="flex items-center gap-2">
          <input defaultChecked={entry?.kv_replicated_across_tp ?? false} name="kv_replicated_across_tp" type="checkbox" />
          KV 在 TP 间复制（如 MLA 结构）
        </label>
      </div>
      <Field label="模型上下文上限">
        <input className={catalogInputClass} defaultValue={entry?.max_model_len} min={1} name="max_model_len" required step={1} type="number" />
      </Field>
      <Field hint="1024 的整数倍。" label="最低可用上下文">
        <input className={catalogInputClass} defaultValue={entry?.min_context_tokens ?? 8192} min={1024} name="min_context_tokens" required step={1024} type="number" />
      </Field>
      <Field hint="镜像引用@sha256:<64 位摘要>，按摘要锁定镜像；引擎目前只支持 vLLM。" label="引擎镜像" wide>
        <input className={`${catalogInputClass} font-mono`} defaultValue={entry?.engine_image} maxLength={255} name="engine_image" required />
      </Field>
      <Field hint="点分数字，如 535.104.05。" label="最低驱动版本">
        <input className={catalogInputClass} defaultValue={entry?.min_driver_version} maxLength={32} name="min_driver_version" required />
      </Field>
      <Field label="启动超时（秒）">
        <input className={catalogInputClass} defaultValue={entry?.startup_timeout_s ?? 1200} max={7200} min={60} name="startup_timeout_s" required step={1} type="number" />
      </Field>
      <Field hint={`JSON 对象，仅限白名单键：${engineArgWhitelist.join("、")}。`} label="引擎参数模板 engine_args" wide>
        <textarea className={areaClass} defaultValue={jsonForEdit(entry?.engine_args) || "{}"} name="engine_args" spellCheck={false} />
      </Field>
      <Field hint={`JSON 对象，须给全以下逻辑名对应的该引擎版本 Prometheus 指标名：${metricsMapKeys.join("、")}。`} label="指标名映射 metrics_map" wide>
        <textarea className={areaClass} defaultValue={jsonForEdit(entry?.metrics_map) || "{}"} name="metrics_map" spellCheck={false} />
      </Field>
    </>
  );
}
