"use client";

import {useState} from "react";

import {OptionChips} from "@/components/managed/option-chips";

import {AdminPage} from "../admin-ui";
import {AdminLeaseTable} from "./admin-lease-table";
import {AdminNodeTasks} from "./admin-node-tasks";
import {AdminOutages} from "./admin-outages";
import {AdminPartialRefunds} from "./admin-partial-refunds";
import {AdminSessionsTable} from "./admin-sessions-table";
import {AdminSupplierCredits} from "./admin-supplier-credits";

type Tab = "leases" | "sessions" | "tasks" | "outages" | "credits" | "refunds";

export function AdminLeases() {
  const [tab, setTab] = useState<Tab>("leases");
  const [leaseNo, setLeaseNo] = useState("");
  return (
    <AdminPage description="检索托管租约、网关会话审计、节点任务队列、停机补偿、供给方信用与部分退款。" eyebrow="Managed leases" title="租约与会话">
      <OptionChips
        items={[
          {value: "leases", label: "租约"},
          {value: "sessions", label: "会话审计"},
          {value: "tasks", label: "节点任务"},
          {value: "outages", label: "停机记录"},
          {value: "credits", label: "供给方信用"},
          {value: "refunds", label: "部分退款"},
        ]}
        label="视图"
        value={tab}
        onChange={setTab}
      />
      {tab === "leases" ? (
        <AdminLeaseTable onShowSessions={(value) => { setLeaseNo(value); setTab("sessions"); }} />
      ) : tab === "sessions" ? (
        <AdminSessionsTable initialLeaseNo={leaseNo} key={leaseNo} />
      ) : tab === "tasks" ? (
        <AdminNodeTasks />
      ) : tab === "outages" ? (
        <AdminOutages />
      ) : tab === "credits" ? (
        <AdminSupplierCredits />
      ) : (
        <AdminPartialRefunds />
      )}
    </AdminPage>
  );
}
