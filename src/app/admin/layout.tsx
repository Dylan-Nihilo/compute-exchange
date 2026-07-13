import type {ReactNode} from "react";

import {AccessBoundary} from "@/components/auth/access-boundary";
import {WorkspaceShell} from "@/components/layout/workspace-shell";

export default function AdminLayout({children}: {children: ReactNode}) {
  return (
    <AccessBoundary>
      <WorkspaceShell>{children}</WorkspaceShell>
    </AccessBoundary>
  );
}
