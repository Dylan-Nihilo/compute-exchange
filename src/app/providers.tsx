"use client";

import {QueryClientProvider} from "@tanstack/react-query";
import {ThemeProvider} from "next-themes";
import {useState} from "react";
import type {ReactNode} from "react";

import {createQueryClient} from "@/lib/query/create-query-client";

export function AppProviders({children}: Readonly<{children: ReactNode}>) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      forcedTheme="light"
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
