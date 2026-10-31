"use client";

import {useQuery} from "@tanstack/react-query";
import Link from "next/link";

import {SectionQueryState} from "@/components/managed/query-states";
import {CopyBlock} from "@/components/scheduler/managed-node/copy-block";
import {formatDateTime} from "@/lib/format/date";
import {expiryReminder, fetchManagedAccess, inactiveHint, leaseStateCopy, scpCommand, sshCommand, type ManagedAccess} from "@/lib/managed-orders";

import {ManagedSection} from "./managed-section";

export function managedAccessKey(orderNo: string) {
  return ["buyer", "orders", "managed-access", orderNo] as const;
}

/**
 * Gateway connection info for a managed order (GET /orders/:id/access). The node IP,
 * supplier account and container port are never exposed (docs/25 §25.6.1).
 */
export function ManagedAccessCard({orderNo, poll, bareMetal = false}: {orderNo: string; poll: boolean; bareMetal?: boolean}) {
  const query = useQuery({
    queryKey: managedAccessKey(orderNo),
    queryFn: () => fetchManagedAccess(orderNo),
    refetchInterval: poll ? 5000 : false,
    retry: false,
  });

  return (
    <ManagedSection
      title="连接信息"
      description={bareMetal ? "经平台访问网关登录整机，到期即断开并清除，没有宽限期。" : "经平台访问网关登录，租期结束后网关自动拒绝新连接。"}
    >
      <SectionQueryState
        error={query.error}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取连接信息"
        notOpenText="托管连接信息接口暂未开放。"
        onRetry={() => void query.refetch()}
      >
        {query.data ? <AccessBody access={query.data} bareMetal={bareMetal} /> : null}
      </SectionQueryState>
    </ManagedSection>
  );
}

function AccessBody({access, bareMetal}: {access: ManagedAccess; bareMetal: boolean}) {
  const canLogin = access.lease_state === "active";
  const expiry = expiryReminder(access, bareMetal);
  const allowsKey = access.auth_methods.includes("publickey");
  const allowsPassword = access.auth_methods.includes("password");
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Item label="租约状态" value={leaseStateCopy[access.lease_state] ?? access.lease_state} />
        <Item label="登录名" value={access.login} />
        <Item label="网关地址" value={`${access.gateway_host}:${access.gateway_port}`} />
        <Item label="可登录至" value={access.access_until ? formatDateTime(access.access_until) : "—"} />
        {access.grace_until && !bareMetal ? <Item label="数据保留至" value={formatDateTime(access.grace_until)} /> : null}
        <Item label="认证方式" value={authMethodsLabel(access.auth_methods)} />
      </dl>
      {bareMetal ? (
        <p className="rounded-xl border border-warning px-4 py-3 text-xs leading-5" role="note">
          整机租用：登录后为宿主机账户 <code className="font-mono">omnis-{access.login}</code>，可使用 sudo。
          <strong className="font-semibold">没有宽限期</strong>，到期即断开并清除整机数据，请在到期前自行导出。
        </p>
      ) : null}
      {expiry ? <p className="text-sm text-warning" role="status">{expiry}</p> : null}
      {canLogin ? (
        <div className="grid gap-3">
          <CopyBlock label="SSH 登录" value={sshCommand(access)} />
          <CopyBlock label="上传文件" value={scpCommand(access)} />
        </div>
      ) : (
        <p className="text-sm text-muted">{inactiveHint(access, bareMetal)}</p>
      )}
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
        {allowsKey ? (
          <li>
            公钥登录：在 <Link className="underline underline-offset-4" href="/console/buyer/ssh-keys">SSH 公钥</Link> 中添加公钥，对名下全部托管租约生效。
          </li>
        ) : null}
        {allowsPassword ? <li>密码登录：使用下方「访问凭证」中的 Access Value 作为网关登录密码。</li> : null}
      </ul>
    </div>
  );
}

function Item({label, value}: {label: string; value: string}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-medium break-all">{value}</dd>
    </div>
  );
}

function authMethodsLabel(methods: readonly string[]) {
  if (!methods.length) return "—";
  const copy: Record<string, string> = {publickey: "公钥", password: "密码"};
  return methods.map((method) => copy[method] ?? method).join(" / ");
}

