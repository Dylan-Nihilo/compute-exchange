"use client";

import {usePathname} from "next/navigation";
import type {ReactNode} from "react";

export function RouteTransition({
  children,
  transitionKey,
}: Readonly<{children: ReactNode; transitionKey?: string}>) {
  const pathname = usePathname();

  return (
    <div
      className="route-transition relative flex min-h-[calc(100svh-72px)] flex-col animate-route-page-enter motion-reduce:animate-none will-change-[opacity,transform]"
      key={transitionKey ?? pathname}
    >
      {children}
    </div>
  );
}
