"use client";

import {useId} from "react";

export type OptionChipItem<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
  description?: string;
};

/** Single-select chip group rendered as toggle buttons (`aria-pressed`) inside a labelled group. */
export function OptionChips<T extends string | number>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: readonly OptionChipItem<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted" id={labelId}>{label}</span>
      <div aria-labelledby={labelId} className="flex flex-wrap gap-2" role="group">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-[color,background-color,border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45 ${
                active
                  ? "bg-[#173447] text-white"
                  : "border border-border bg-surface text-foreground hover:border-[#afc4ce]"
              }`}
              disabled={item.disabled}
              key={String(item.value)}
              onClick={() => onChange(item.value)}
              title={item.description}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
