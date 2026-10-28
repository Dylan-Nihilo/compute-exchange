import {checkTone, type FeasibilityCheck} from "@/lib/model-deploy";

const toneClass = {
  ok: "text-success",
  warn: "text-warning",
  block: "text-danger",
} as const;
const toneMark = {ok: "通过", warn: "提示", block: "不通过"} as const;

/** Feasibility checks F1–F8 exactly as returned by deploy-plans or a 40001 rejection. */
export function ChecksList({checks}: {checks: readonly FeasibilityCheck[]}) {
  if (checks.length === 0) return null;
  return (
    <ul className="space-y-1.5 text-sm">
      {checks.map((check) => {
        const tone = checkTone(check);
        return (
          <li className="flex gap-3" key={check.id}>
            <span className={`w-14 shrink-0 font-mono text-xs leading-5 ${toneClass[tone]}`}>
              {check.id} {toneMark[tone]}
            </span>
            <span className="min-w-0 text-muted">{check.message || "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}
