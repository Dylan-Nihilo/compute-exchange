"use client";

import {EmptyState as ProEmptyState} from "@heroui-pro/react/empty-state";
import {Button} from "@heroui/react";
import {Check, CircleAlert, Clock3, LoaderCircle, RotateCw} from "lucide";
import {motion, useReducedMotion} from "motion/react";
import Image from "next/image";
import type {ComponentProps, ReactNode} from "react";

import {InteractiveIcon} from "./interactive-icon";
import {OmnisLoader} from "./omnis-loader";

export function LoadingState({label = "正在加载"}: {label?: string}) {
  return (
    <div className="grid min-h-64 flex-1 place-items-center px-6 py-12 text-center">
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
    <div className="grid min-h-64 w-full place-items-center px-6 py-12 text-center">
      <div className="flex w-full max-w-lg flex-col items-center">
        <div className="mb-6 grid size-16 place-items-center rounded-full border border-danger/20 bg-danger/10 text-danger">
          <InteractiveIcon icon={CircleAlert} size={28} />
        </div>
        <h2 className="text-[26px] font-semibold leading-9 tracking-[-0.025em] text-foreground">
          {title}
        </h2>
        <p className="mt-3 max-w-md text-base leading-7 text-muted">
          {description}
        </p>
        {onRetry ? (
          <Button
            className="mt-7 min-h-11 rounded-[12px] px-6"
            isPending={isPending}
            onPress={onRetry}
            variant="outline"
          >
            <InteractiveIcon
              className={isPending ? "animate-spin" : undefined}
              icon={isPending ? LoaderCircle : RotateCw}
              size={16}
            />
            {isPending ? "正在重试" : "重新尝试"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ResultState({
  action,
  description,
  icon,
  status = "success",
  title,
}: {
  action?: ReactNode;
  description: string;
  icon?: ComponentProps<typeof InteractiveIcon>["icon"];
  status?: "success" | "warning";
  title: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const ResultIcon = icon ?? Clock3;
  const showBrandMark = status === "success" && !icon;

  return (
    <motion.section
      animate={{opacity: 1, y: 0}}
      className="grid min-h-[min(560px,68svh)] place-items-center px-4 py-12 text-center"
      initial={{opacity: 0, y: shouldReduceMotion ? 0 : 12}}
      transition={{
        duration: shouldReduceMotion ? 0.12 : 0.36,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="flex w-full max-w-lg flex-col items-center">
        {showBrandMark ? (
          <div className="relative mb-7 flex h-20 w-28 items-center justify-center">
            <Image
              alt=""
              aria-hidden="true"
              className="h-auto w-[78px]"
              height={80}
              src="/brand/omnis/OmniS-logo-mark-blue.svg"
              width={115}
            />
            <span className="absolute bottom-0 right-1 grid size-7 place-items-center rounded-full border-[3px] border-surface bg-[#173d52] text-white shadow-sm">
              <InteractiveIcon icon={Check} size={14} strokeWidth={2.5} />
            </span>
          </div>
        ) : (
          <div className="mb-7 grid size-16 place-items-center rounded-[18px] border border-border bg-surface-secondary text-[#587487]">
            <InteractiveIcon icon={ResultIcon} size={28} />
          </div>
        )}
        <h1 className="text-[32px] font-semibold leading-[1.2] tracking-[-0.035em] text-foreground sm:text-[36px]">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-muted sm:text-[17px]">
          {description}
        </p>
        {action ? (
          <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div>
        ) : null}
      </div>
    </motion.section>
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
