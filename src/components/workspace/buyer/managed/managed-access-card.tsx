"use client";

import {useQuery} from "@tanstack/react-query";
import Link from "next/link";

import {SectionQueryState} from "@/components/managed/query-states";
import {CopyBlock} from "@/components/scheduler/managed-node/copy-block";
import {formatDateTime} from "@/lib/format/date";
import {fetchManagedAccess, leaseStateCopy, scpCommand, sshCommand, type ManagedAccess} from "@/lib/managed-orders";

import {ManagedSection} from "./managed-section";

export function managedAccessKey(orderNo: string) {
  return ["buyer", "orders", "managed-access", orderNo] as const;
}

/**
 * Gateway connection info for a managed order (GET /orders/:id/access). The node IP,
 * supplier account and container port are never exposed (docs/25 §25.6.1).
 */
export function ManagedAccessCard({orderNo, poll}: {orderNo: string; poll: boolean}) {
  const query = useQuery({
    queryKey: managedAccessKey(orderNo),
    queryFn: () => fetchManagedAccess(orderNo),
    refetchInterval: poll ? 5000 : false,
    retry: false,
  });

  return (
    <ManagedSection title="连接信息" description="经平台访问网关登录，租期结束后网关自动拒绝新连接。">
      <SectionQueryState
        error={query.error}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取连接信息"
        notOpenText="托管连接信息接口暂未开放。"
        onRetry={() => void query.refetch()}
      >
        {query.data ? <AccessBody access={query.data} /> : null}
      </SectionQueryState>
    </ManagedSection>
  );
}

function AccessBody({access}: {access: ManagedAccess}) {
  const canLogin = access.lease_state === "active";
  const allowsKey = access.auth_methods.includes("publickey");
  const allowsPassword = access.auth_methods.includes("password");
  return (
    <div className="space-y-4">
      {access.resource_alert ? (
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          资源异常：{access.resource_alert}。期间不可用时长将自动记录为停机，见下方停机记录。
        </p>
      ) : null}
      <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
        <Item label="租约状态" value={leaseStateCopy[access.lease_state] ?? access.lease_state} />
        <Item label="登录名" value={access.login} />
        <Item label="网关地址" value={`${access.gateway_host}:${access.gateway_port}`} />
        <Item label="可登录至" value={access.access_until ? formatDateTime(access.access_until) : "—"} />
        {access.grace_until ? <Item label="数据保留至" value={formatDateTime(access.grace_until)} /> : null}
        <Item label="认证方式" value={authMethodsLabel(access.auth_methods)} />
      </dl>
      {canLogin ? (
        <div className="grid gap-3">
          <CopyBlock label="SSH 登录" value={sshCommand(access)} />
          <CopyBlock label="上传文件" value={scpCommand(access)} />
        </div>
      ) : (
        <p className="text-sm text-muted">{inactiveHint(access.lease_state)}</p>
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

function inactiveHint(state: string) {
  if (state === "pending" || state === "provisioning" || state === "reserved") return "平台正在开通资源，自检通过后即可登录，开通耗时不计入租期。";
  if (state === "grace") return "租期已结束，访问已停止；宽限期内续租可恢复原环境与数据。";
  if (state === "parked") return "当前不在包夜窗口内，窗口开始后自动恢复。";
  if (state === "suspended") return "订单已冻结，访问暂停，请查看工单通知。";
  if (state === "failed") return "开通失败，订单将自动取消并原路退款，以订单状态为准。";
  return "当前租约不可登录。";
}
