import type {Metadata} from "next";
import type {ReactNode} from "react";

import {SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, SITE_URL} from "@/lib/site";

import "./globals.css";

import {AppProviders} from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: "%s | 万象硅芯 OmniS",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "zh_CN",
    images: [SITE_IMAGE],
  },
  twitter: {card: "summary_large_image", images: [SITE_IMAGE.url]},
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
