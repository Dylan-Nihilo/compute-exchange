import {formatDateTime} from "@/lib/format/date";
import {deployStateCopy, type Deployment} from "@/lib/model-deploy";

/** Deployment history of this lease; selecting a row shows its status, health and logs. */
export function DeploymentHistory({deployments, selected, onSelect}: {
  deployments: readonly Deployment[];
  selected: string | null;
  onSelect: (deployNo: string) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {deployments.map((item) => (
        <li key={item.deploy_no}>
          <button
            aria-current={item.deploy_no === selected ? "true" : undefined}
            className={`flex w-full flex-wrap items-center justify-between gap-2 px-2 py-2.5 text-left text-sm transition-colors hover:bg-surface-secondary ${
              item.deploy_no === selected ? "bg-surface-secondary" : ""
            }`}
            type="button"
            onClick={() => onSelect(item.deploy_no)}
          >
            <span className="min-w-0">
              <span className="font-medium">{item.model.display_name || item.model.model_key}</span>
              <span className="ml-2 text-xs text-muted">TP{item.tp} × DP{item.dp}</span>
            </span>
            <span className="text-xs text-muted">
              {deployStateCopy[item.state] ?? item.state}
               · {formatDateTime(item.created_at)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
