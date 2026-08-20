import type {ReactNode} from "react";

import {PublicHeader} from "@/components/layout/public-header";
import {RouteTransition} from "@/components/layout/route-transition";

export default function PortalLayout({children}: {children: ReactNode}) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <PublicHeader />
      <RouteTransition>{children}</RouteTransition>
    </div>
  );
}
