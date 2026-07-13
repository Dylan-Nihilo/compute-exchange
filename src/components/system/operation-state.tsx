"use client";

import {Alert, Button} from "@heroui/react";

export function LoadingState({label = "正在加载"}: {label?: string}) {
  return (
    <div
      className="grid min-h-64 place-items-center gap-3 px-6 py-12 text-center"
      role="status"
    >
      <div>
        <span
          aria-hidden="true"
          className="mx-auto block size-5 animate-spin rounded-full border-2 border-border border-t-foreground"
        />
        <p className="mt-3 text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

export function ErrorState({
  description = "请求未完成，请重新尝试。",
  onRetry,
  title = "服务暂时不可用",
}: {
  description?: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-12">
      <Alert status="danger">
        <Alert.Content>
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description>{description}</Alert.Description>
        </Alert.Content>
      </Alert>
      {onRetry ? (
        <Button className="mt-4" onPress={onRetry} variant="outline">
          重新尝试
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  action,
  description,
  title,
}: {
  action?: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="border-y border-border bg-surface px-6 py-10 text-center">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
