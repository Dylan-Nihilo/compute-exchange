import {Alert} from "@heroui/react";

export const fieldClassName =
  "min-h-12 w-full rounded-lg border border-border-secondary bg-surface px-3.5 text-base text-foreground outline-none placeholder:text-muted focus:border-focus focus:ring-2 focus:ring-focus/20";

export function SliderVerification({
  disabled = false,
  id,
  onValueChange,
  value,
}: {
  disabled?: boolean;
  id: string;
  onValueChange: (value: number) => void;
  value: number;
}) {
  const verified = value === 100;

  return (
    <div className="rounded-lg border border-border-secondary bg-surface px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <label className="font-medium" htmlFor={id}>
          安全验证
        </label>
        <span className={verified ? "text-success" : "text-muted"}>
          {verified ? "验证已完成" : "向右拖动滑块"}
        </span>
      </div>
      <input
        aria-readonly={verified}
        aria-valuetext={verified ? "验证已完成" : `验证进度 ${value}%`}
        className={`h-8 w-full accent-current disabled:cursor-not-allowed disabled:opacity-50 ${verified ? "cursor-default" : "cursor-pointer"}`}
        disabled={disabled}
        id={id}
        max={100}
        min={0}
        onChange={(event) => {
          if (!verified) onValueChange(Number(event.currentTarget.value));
        }}
        step={10}
        type="range"
        value={value}
      />
    </div>
  );
}

export function FormError({error}: {error: unknown}) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "操作未完成，请重试。";

  return (
    <Alert status="danger">
      <Alert.Content>
        <Alert.Title>操作未完成</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function FormHeading({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-foreground">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
    </header>
  );
}
