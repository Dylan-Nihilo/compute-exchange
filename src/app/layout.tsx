import type {Metadata} from "next";
import type {ReactNode} from "react";

import "./globals.css";

import {AppProviders} from "./providers";

export const metadata: Metadata = {
  title: {
    default: "万象硅芯 OmniS",
    template: "%s | 万象硅芯 OmniS",
  },
  description: "合规算力交易与 AI Token 服务平台",
  icons: {
    icon: "/brand/omnis/OmniS-logo-mark-blue.svg",
    shortcut: "/brand/omnis/OmniS-logo-mark-blue.svg",
  },
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
