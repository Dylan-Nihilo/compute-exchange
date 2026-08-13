import type {ReactNode} from "react";

import {PublicHeader} from "@/components/layout/public-header";
import {MarketAtmosphere} from "@/components/market/market-view";

export default function MarketLayout({children}: Readonly<{children: ReactNode}>) {
  return (
    <div className="relative isolate min-h-svh bg-[#f8fbfd] text-foreground">
      <MarketAtmosphere />
      <PublicHeader />
      {children}
    </div>
  );
}
