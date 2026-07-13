import type {ReactNode} from "react";

import {PublicHeader} from "@/components/layout/public-header";

export default function PortalLayout({children}: {children: ReactNode}) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <PublicHeader />
      {children}
    </div>
  );
}
