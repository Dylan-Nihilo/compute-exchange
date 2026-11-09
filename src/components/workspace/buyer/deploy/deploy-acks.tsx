"use client";

import type {CatalogModel, FeasibilityCheck} from "@/lib/model-deploy";

export type AckState = {license: boolean; untested: boolean};

/**
 * F7 / F8 acknowledgements, driven by `confirm` checks carrying `ack`. The backend check message is
 * shown verbatim; the checkbox wording only states facts.
 * TODO(legal-v2): the acknowledgement wording for restricted-licence models (F7) is pending
 * business and legal sign-off (docs/27, legal text v2). Replace these factual labels once approved.
 */
export function DeployAcks({required, checks, model, value, disabled, onChange}: {
  required: AckState;
  checks: readonly FeasibilityCheck[];
  model: CatalogModel | null;
  value: AckState;
  disabled: boolean;
  onChange: (next: AckState) => void;
}) {
  if (!required.license && !required.untested) return null;
  const messageFor = (ack: FeasibilityCheck["ack"]) => checks.find((check) => check.ack === ack && !check.ok)?.message;
  return (
    <fieldset className="space-y-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
      <legend className="px-1 text-xs font-medium text-warning">提交前需确认</legend>
      {required.license ? (
        <label className="flex items-start gap-2">
          <input
            checked={value.license}
            className="mt-0.5"
            disabled={disabled}
            type="checkbox"
            onChange={(event) => onChange({...value, license: event.target.checked})}
          />
          <span>
            {model?.commercial_use === "restricted" ? "已知悉该模型的许可证为受限类型" : "已知悉该模型许可证的商用条件尚未核实"}
            {model?.license ? `（${model.license}）` : ""}。
            {messageFor("license_ack") ? <span className="block text-xs text-muted">{messageFor("license_ack")}</span> : null}
          </span>
        </label>
      ) : null}
      {required.untested ? (
        <label className="flex items-start gap-2">
          <input
            checked={value.untested}
            className="mt-0.5"
            disabled={disabled}
            type="checkbox"
            onChange={(event) => onChange({...value, untested: event.target.checked})}
          />
          <span>
            已知悉本租约的卡型尚无该模型的真机验证记录，部署结果以实际运行为准。
            {messageFor("untested_ack") ? <span className="block text-xs text-muted">{messageFor("untested_ack")}</span> : null}
          </span>
        </label>
      ) : null}
    </fieldset>
  );
}
