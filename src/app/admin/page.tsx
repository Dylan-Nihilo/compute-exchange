"use client";

import {WorkspaceHome} from "@/components/workspace/workspace-home";
import {useAuthStore} from "@/lib/auth/store";

export default function AdminWorkspacePage() {
  const activeRole = useAuthStore((state) => state.activeRole);
  return <WorkspaceHome role={activeRole === "admin" ? "admin" : "operator"} />;
}
