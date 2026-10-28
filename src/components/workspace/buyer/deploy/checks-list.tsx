import {checkTone, isUndeterminedCheck, type FeasibilityCheck} from "@/lib/model-deploy";

const toneClass = {
  ok: "text-success",
  warn: "text-warning",
  confirm: "text-warning",
  block: "text-danger",
} as const;
const toneMark = {ok: "通过", warn: "提示", confirm: "需确认", block: "不通过"} as const;

/** Checks M1/M2/F1–F8 exactly as returned by deploy-plans (level info/error/warning/confirm). */
export function ChecksList({checks}: {checks: readonly FeasibilityCheck[]}) {
  if (checks.length === 0) return null;
  return (
    <ul className="space-y-1.5 text-sm">
      {checks.map((check) => {
        const tone = checkTone(check);
        const undetermined = isUndeterminedCheck(check);
        return (
          <li className="flex gap-3" key={check.id}>
            <span className={`w-20 shrink-0 font-mono text-xs leading-5 ${undetermined ? "text-muted" : toneClass[tone]}`}>
              {check.id} {undetermined ? "无法判定" : toneMark[tone]}
            </span>
            <span className="min-w-0 text-muted">{check.message || "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}
