"use client";

import {ToastProvider} from "@heroui/react";
import {QueryClientProvider} from "@tanstack/react-query";
import {ThemeProvider} from "next-themes";
import {useState} from "react";
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
        {children}
        <ToastProvider placement="top end" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
