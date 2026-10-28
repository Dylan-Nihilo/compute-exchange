"use client";

import {useState} from "react";

import {OptionChips} from "@/components/managed/option-chips";

import {AdminPage} from "../admin-ui";
import {AdminDeadTasks} from "./admin-dead-tasks";
import {AdminLeaseTable} from "./admin-lease-table";
import {AdminSessionsTable} from "./admin-sessions-table";

type Tab = "leases" | "sessions" | "tasks";

export function AdminLeases() {
  const [tab, setTab] = useState<Tab>("leases");
  const [leaseNo, setLeaseNo] = useState("");
  return (
    <AdminPage description="检索托管租约、网关会话审计与重试耗尽的节点任务。" eyebrow="Managed leases" title="租约与会话">
      <OptionChips
        items={[
          {value: "leases", label: "租约"},
          {value: "sessions", label: "会话审计"},
          {value: "tasks", label: "死信任务"},
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
        <AdminDeadTasks />
      )}
    </AdminPage>
  );
}
