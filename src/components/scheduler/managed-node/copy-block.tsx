"use client";

import {Button} from "@heroui/react";
import {useState} from "react";

/** Read-only monospace block with a copy button; the clipboard failure is shown, never swallowed. */
export function CopyBlock({label, value}: {label: string; value: string}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <Button
          size="sm"
          variant="ghost"
          onPress={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setState("copied");
            } catch {
              setState("failed");
            }
          }}
        >
          {state === "copied" ? "已复制" : "复制"}
        </Button>
      </div>
      <pre className="mt-1 max-h-64 overflow-auto rounded-xl border border-border bg-surface-secondary px-3 py-2.5 font-mono text-xs leading-5 break-all whitespace-pre-wrap">
        {value}
      </pre>
      {state === "failed" ? <p className="mt-1 text-xs text-danger" role="alert">复制失败，请手动选择内容复制。</p> : null}
    </div>
  );
}
