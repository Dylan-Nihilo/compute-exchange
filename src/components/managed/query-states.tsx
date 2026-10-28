"use client";

import {Button, Spinner} from "@heroui/react";
import {useEffect, useState, type ReactNode} from "react";

import {isNotOpenError} from "@/lib/api/envelope";

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Compact loading / not-open / error / empty states for a section inside a page.
 * "Not open" means the backend has not released the endpoint yet (BFF 501), which is
 * different from a failed request.
 */
export function SectionQueryState({
  emptyText,
  error,
  isEmpty = false,
  isError,
  isPending,
  isRefetching = false,
  loadingText = "正在加载",
  notOpenText = "该功能暂未开放，开放后将在此显示。",
  onRetry,
  children,
}: {
  emptyText?: string;
  error: unknown;
  isEmpty?: boolean;
  isError: boolean;
  isPending: boolean;
  isRefetching?: boolean;
  loadingText?: string;
  notOpenText?: string;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  if (isPending) {
    return (
      <p className="flex items-center gap-2 py-4 text-sm text-muted" role="status">
        <Spinner aria-hidden="true" size="sm" />
        {loadingText}
      </p>
    );
  }
  if (isError) {
    if (isNotOpenError(error)) {
      return <p className="py-4 text-sm text-muted" role="status">{notOpenText}</p>;
    }
    return (
      <div className="flex flex-wrap items-center gap-3 py-4 text-sm text-danger" role="alert">
        <span>{error instanceof Error && error.message ? error.message : "读取失败"}</span>
        {onRetry ? (
          <Button isPending={isRefetching} onPress={onRetry} size="sm" variant="outline">
            重试
          </Button>
        ) : null}
      </div>
    );
  }
  if (isEmpty && emptyText) {
    return <p className="py-4 text-sm text-muted">{emptyText}</p>;
  }
  return <>{children}</>;
}
