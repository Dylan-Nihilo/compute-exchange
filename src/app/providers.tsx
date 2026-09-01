"use client";

import {ToastProvider} from "@heroui/react";
import {QueryClientProvider} from "@tanstack/react-query";
import {ThemeProvider} from "next-themes";
import {useEffect, useState} from "react";
import type {ReactNode} from "react";

import {AuthSessionBootstrap} from "@/components/auth/auth-session";
import {createQueryClient} from "@/lib/query/create-query-client";

export function AppProviders({children}: Readonly<{children: ReactNode}>) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="compute-exchange:theme"
    >
      <QueryClientProvider client={queryClient}>
        <AuthSessionBootstrap />
        <NativeScrollbarActivity />
        {children}
        <ToastProvider placement="top end" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function NativeScrollbarActivity() {
  useEffect(() => {
    const timers = new Map<HTMLElement, number>();
    const handleScroll = (event: Event) => {
      const region =
        event.target === document ? document.documentElement : event.target;
      if (!(region instanceof HTMLElement)) return;

      region.classList.add("is-scrolling");
      window.clearTimeout(timers.get(region));
      timers.set(
        region,
        window.setTimeout(() => {
          region.classList.remove("is-scrolling");
          timers.delete(region);
        }, 700),
      );
    };

    document.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("scroll", handleScroll, true);
      for (const [region, timer] of timers) {
        window.clearTimeout(timer);
        region.classList.remove("is-scrolling");
      }
    };
  }, []);

  return null;
}
