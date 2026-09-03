import {CircleDashed} from "lucide";
import type {ComponentProps, ReactNode} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";

export function EmptyState({
  action,
  description,
  icon = CircleDashed,
  title,
}: {
  action?: ReactNode;
  description?: string;
  icon?: ComponentProps<typeof InteractiveIcon>["icon"];
  title: string;
}) {
  return (
    <section className="grid h-full min-h-[inherit] place-items-center px-6 py-14 text-center">
      <div className="flex w-full max-w-lg flex-col items-center">
        <div className="mb-6 grid size-16 place-items-center rounded-full border border-border bg-surface-secondary text-muted">
          <InteractiveIcon icon={icon} size={28} />
        </div>
        <h2 className="text-[26px] font-semibold leading-9 tracking-[-0.025em] text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-md text-base leading-7 text-muted">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-7">{action}</div> : null}
      </div>
    </section>
  );
}
