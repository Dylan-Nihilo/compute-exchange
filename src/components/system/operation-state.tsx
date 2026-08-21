"use client";

import {EmptyState as ProEmptyState} from "@heroui-pro/react/empty-state";
import {Alert, Button, Spinner} from "@heroui/react";

import {OmnisLoader} from "./omnis-loader";

export function LoadingState({label = "正在加载"}: {label?: string}) {
  return (
    <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
      <OmnisLoader label={label} size="sm" />
    </div>
  );
}

export function ErrorState({
  description = "请求未完成，请重新尝试。",
  isPending = false,
  onRetry,
  title = "服务暂时不可用",
}: {
  description?: string;
  isPending?: boolean;
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
        <Button
          className="mt-4"
          isPending={isPending}
          onPress={onRetry}
          variant="outline"
        >
          {isPending ? (
            <>
              <Spinner aria-hidden="true" color="current" size="sm" />
              正在重试
            </>
          ) : (
            "重新尝试"
          )}
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
