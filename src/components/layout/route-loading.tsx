"use client";

import {Spinner} from "@heroui/react";

export function RouteLoading({label = "正在加载页面"}: {label?: string}) {
  return (
    <div
      aria-label={label}
      aria-live="polite"
      className="route-loading fixed inset-0 z-[100] grid animate-route-loading-enter place-items-center motion-reduce:animate-none"
      role="status"
    >
      <Spinner
        className="text-[#24476d] motion-reduce:animate-none"
        color="current"
        size="md"
      />
    </div>
  );
}
