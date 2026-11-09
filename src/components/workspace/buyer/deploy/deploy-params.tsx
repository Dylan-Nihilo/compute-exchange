"use client";

import {OptionChips} from "@/components/managed/option-chips";
import {GPU_MEM_UTIL_MAX, GPU_MEM_UTIL_MIN, type DeployPlan} from "@/lib/model-deploy";

export const planKey = (plan: DeployPlan) => `${plan.tp}x${plan.dp}`;

export type DeployParams = {
  planKey: string | null;
  maxModelLen: string;
  canary: boolean;
};

const fieldClass = "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm";

/** Parallelism plan, context length (≤ plan suggestion) and canary toggle. */
export function DeployParamsFields({plans, value, disabled, onChange}: {
  plans: readonly DeployPlan[];
  value: DeployParams;
  disabled: boolean;
  onChange: (next: DeployParams) => void;
}) {
  const plan = plans.find((item) => planKey(item) === value.planKey) ?? null;
  return (
    <div className="space-y-4">
      <OptionChips
        items={plans.map((item) => ({
          value: planKey(item),
          label: `TP${item.tp} × DP${item.dp}${item.recommended ? " · 推荐" : ""}`,
          description: `${item.cards_used} 卡 · 上下文 ≤ ${item.max_model_len.toLocaleString("zh-CN")}`,
          disabled,
        }))}
        label="并行方案（张量并行 TP × 副本 DP）"
        value={value.planKey}
        onChange={(next) => {
          const chosen = plans.find((item) => planKey(item) === next);
          onChange({...value, planKey: next, maxModelLen: chosen ? String(chosen.max_model_len) : value.maxModelLen});
        }}
      />
      {plan ? (
        <p className={`text-xs ${plan.context_tight ? "text-warning" : "text-muted"}`}>
          占用 {plan.cards_used} 张卡，建议最大上下文 {plan.max_model_len.toLocaleString("zh-CN")} tokens
          {plan.context_tight ? "，接近模型最低上下文要求，长上下文请求可能排队或被拒绝" : ""}。
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="text-muted">最大上下文长度（tokens）</span>
        <input
          className={`${fieldClass} mt-1`}
          disabled={disabled || !plan}
          inputMode="numeric"
          max={plan?.max_model_len}
          min={1}
          type="number"
          value={value.maxModelLen}
          onChange={(event) => onChange({...value, maxModelLen: event.target.value})}
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          checked={value.canary}
          className="mt-0.5"
          disabled={disabled}
          type="checkbox"
          onChange={(event) => onChange({...value, canary: event.target.checked})}
        />
        <span>
          启用探针请求
          <span className="block text-xs text-muted">每轮健康检测（约 60 秒）发送 1 个 token 的测试补全，用于判断推理是否真正可用；关闭后不参与健康判定。</span>
        </span>
      </label>
    </div>
  );
}

/** Returns a message when the context length is invalid for the chosen plan, else null. */
export function maxLenError(plan: DeployPlan | null, raw: string) {
  if (!plan) return "请选择并行方案";
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return "请输入正整数的上下文长度";
  if (value > plan.max_model_len) return `上下文长度不能超过 ${plan.max_model_len.toLocaleString("zh-CN")}`;
  return null;
}

/** Memory-utilisation slider (0.80–0.95). Plans are re-evaluated by deploy-plans for the chosen value. */
export function GpuMemUtilField({value, disabled, onChange}: {value: number; disabled: boolean; onChange: (next: number) => void}) {
  return (
    <label className="block text-sm">
      <span className="text-muted">显存利用率 {value.toFixed(2)}（调整后重新判定可行方案）</span>
      <input
        className="mt-3 w-full accent-[#173447]"
        disabled={disabled}
        max={GPU_MEM_UTIL_MAX}
        min={GPU_MEM_UTIL_MIN}
        step={0.01}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
