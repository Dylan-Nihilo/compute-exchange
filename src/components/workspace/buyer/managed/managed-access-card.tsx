"use client";

import {useQuery} from "@tanstack/react-query";
import Link from "next/link";

import {SectionQueryState} from "@/components/managed/query-states";
import {CopyBlock} from "@/components/scheduler/managed-node/copy-block";
import {formatDateTime} from "@/lib/format/date";
import {
  accessEndpoint,
  accessModeOf,
  bareMetalAccount,
  expiryReminder,
  fetchManagedAccess,
  inactiveHint,
  isBareMetalLease,
  leaseStateCopy,
  scpCommand,
  sshCommand,
  type AccessMode,
  type ManagedAccess,
} from "@/lib/managed-orders";

import {ManagedSection} from "./managed-section";

export function managedAccessKey(orderNo: string) {
  return ["buyer", "orders", "managed-access", orderNo] as const;
}

/**
 * Connection info for a managed order (GET /orders/:id/access). Gateway mode exposes only the platform
 * gateway; direct mode exposes the node address and the lease's mapped port (public key only), never the
 * supplier's management account.
 */
export function ManagedAccessCard({orderNo, poll, productDeliveryMode, nightly = false}: {orderNo: string; poll: boolean; productDeliveryMode?: string | null; nightly?: boolean}) {
  const query = useQuery({
    queryKey: managedAccessKey(orderNo),
    queryFn: () => fetchManagedAccess(orderNo),
    refetchInterval: poll ? 5000 : false,
    retry: false,
  });
  const bareMetal = isBareMetalLease(query.data, productDeliveryMode);

  return (
    <ManagedSection title="连接信息" description={accessDescription(accessModeOf(query.data), bareMetal, nightly)}>
      <SectionQueryState
        error={query.error}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取连接信息"
        notOpenText="托管连接信息接口暂未开放。"
        onRetry={() => void query.refetch()}
      >
        {query.data ? <AccessBody access={query.data} bareMetal={bareMetal} nightly={nightly} /> : null}
      </SectionQueryState>
    </ManagedSection>
  );
}

function AccessBody({access, bareMetal, nightly}: {access: ManagedAccess; bareMetal: boolean; nightly: boolean}) {
  const canLogin = access.lease_state === "active";
  const expiry = expiryReminder(access, bareMetal);
  const allowsKey = access.auth_methods.includes("publickey");
  const allowsPassword = access.auth_methods.includes("password");
  const direct = accessModeOf(access) === "direct";
  const endpoint = accessEndpoint(access);
  const ssh = sshCommand(access);
  const scp = scpCommand(access, bareMetal);
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Item label="租约状态" value={leaseStateCopy[access.lease_state] ?? access.lease_state} />
        <Item label="登录名" value={access.login} />
        <Item label={direct ? "连接地址" : "网关地址"} value={endpoint ? `${endpoint.host}:${endpoint.port}` : "开通完成后显示"} />
        <Item label={nightly ? "最后一晚结束" : "可登录至"} value={access.access_until ? formatDateTime(access.access_until) : "—"} />
        {access.grace_until && !bareMetal ? <Item label="数据保留至" value={formatDateTime(access.grace_until)} /> : null}
        <Item label="认证方式" value={authMethodsLabel(access.auth_methods)} />
        {access.host_key_fingerprint ? <Item label="主机指纹（首次连接时核对）" value={access.host_key_fingerprint} /> : null}
      </dl>
      {bareMetal ? (
        <p className="rounded-xl border border-warning px-4 py-3 text-xs leading-5" role="note">
          整机租用：登录后为宿主机账户 <code className="font-mono">{bareMetalAccount(access)}</code>，可使用 sudo。
          <strong className="font-semibold">没有宽限期</strong>，到期即断开并清除整机数据，请在到期前自行导出。
        </p>
      ) : null}
      {expiry ? <p className="text-sm text-warning" role="status">{expiry}</p> : null}
      {canLogin && ssh && scp ? (
        <div className="grid gap-3">
          <CopyBlock label="SSH 登录" value={ssh} />
          <CopyBlock label="上传文件" value={scp} />
        </div>
      ) : canLogin ? (
        <p className="text-sm text-muted">连接地址尚未就绪，请稍后刷新。</p>
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

function accessDescription(mode: AccessMode, bareMetal: boolean, nightly: boolean) {
  if (mode === "direct") {
    if (nightly) return "包夜：仅在每晚窗口内开机，可用 SSH 公钥直接登录；窗口外机器停机、无法连接。";
    return bareMetal
      ? "使用 SSH 公钥直接登录整机，到期即断开并清除，没有宽限期。"
      : "使用 SSH 公钥直接登录租约环境（独立容器，不含宿主机账户）；租期结束或冻结时平台断开连接并停机。";
  }
  if (nightly) return "包夜：仅在每晚窗口内可经平台访问网关登录，窗口外网关拒绝连接。";
  return bareMetal ? "经平台访问网关登录整机，到期即断开并清除，没有宽限期。" : "经平台访问网关登录，租期结束后网关自动拒绝新连接。";
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

