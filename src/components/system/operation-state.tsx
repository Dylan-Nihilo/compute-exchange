"use client";

import {EmptyState as ProEmptyState} from "@heroui-pro/react/empty-state";
import {Alert, Button, ProgressCircle} from "@heroui/react";

export function LoadingState({label = "正在加载"}: {label?: string}) {
  return (
    <div
      aria-live="polite"
      className="grid min-h-64 place-items-center px-6 py-12 text-center"
      role="status"
    >
      <div className="flex flex-col items-center gap-3">
        <ProgressCircle
          isIndeterminate
          aria-label={label}
          id="operation-loading-progress"
        >
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <p className="text-sm text-muted">{label}</p>
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
    <ProEmptyState>
      <ProEmptyState.Header>
        <ProEmptyState.Title>{title}</ProEmptyState.Title>
        <ProEmptyState.Description>{description}</ProEmptyState.Description>
      </ProEmptyState.Header>
      {action ? <ProEmptyState.Content>{action}</ProEmptyState.Content> : null}
    </ProEmptyState>
  );
}
