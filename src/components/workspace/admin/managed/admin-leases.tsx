"use client";

import {useState} from "react";

import {OptionChips} from "@/components/managed/option-chips";

import {AdminPage} from "../admin-ui";
import {AdminLeaseTable} from "./admin-lease-table";
import {AdminNodeTasks} from "./admin-node-tasks";
import {AdminSessionsTable} from "./admin-sessions-table";

type Tab = "leases" | "sessions" | "tasks";

export function AdminLeases() {
  const [tab, setTab] = useState<Tab>("leases");
  const [leaseNo, setLeaseNo] = useState("");
  return (
    <AdminPage description="检索托管租约、网关会话审计与节点任务队列（死信任务可手动重试）。" eyebrow="Managed leases" title="租约与会话">
      <OptionChips
        items={[
          {value: "leases", label: "租约"},
          {value: "sessions", label: "会话审计"},
          {value: "tasks", label: "节点任务"},
        ]}
        label="视图"
        value={tab}
        onChange={setTab}
      />
      {tab === "leases" ? (
        <AdminLeaseTable onShowSessions={(value) => { setLeaseNo(value); setTab("sessions"); }} />
      ) : tab === "sessions" ? (
        <AdminSessionsTable initialLeaseNo={leaseNo} key={leaseNo} />
      ) : (
        <AdminNodeTasks />
      )}
    </AdminPage>
  );
}
