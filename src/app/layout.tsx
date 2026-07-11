import type {Metadata} from "next";
import type {ReactNode} from "react";

import "./globals.css";

import {AppProviders} from "./providers";

export const metadata: Metadata = {
  title: {
    default: "算力撮合交易平台",
    template: "%s | 算力撮合交易平台",
  },
  description: "合规算力交易与 AI Token 服务平台",
};

export default function RootLayout({children}: Readonly<{children: ReactNode}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
