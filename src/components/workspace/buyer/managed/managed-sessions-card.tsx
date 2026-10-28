"use client";

import {useQuery} from "@tanstack/react-query";

import {SectionQueryState} from "@/components/managed/query-states";
import {formatDateTime} from "@/lib/format/date";
import {fetchAccessSessions, formatBytes} from "@/lib/managed-orders";

import {ManagedSection} from "./managed-section";

/** Gateway session audit for this lease (metadata only; content is never recorded). */
export function ManagedSessionsCard({orderNo}: {orderNo: string}) {
  const query = useQuery({
    queryKey: ["buyer", "orders", "managed-sessions", orderNo],
    queryFn: () => fetchAccessSessions(orderNo),
    retry: false,
  });
  const sessions = query.data ?? [];

  return (
    <ManagedSection title="会话记录" description="网关只记录来源 IP、认证方式、起止时间与流量，不记录会话内容。">
      <SectionQueryState
        emptyText="暂无登录会话。"
        error={query.error}
        isEmpty={sessions.length === 0}
        isError={query.isError}
        isPending={query.isPending}
        isRefetching={query.isFetching}
        loadingText="正在读取会话记录"
        notOpenText="会话记录接口暂未开放。"
        onRetry={() => void query.refetch()}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">开始</th>
                <th className="py-2 pr-3 font-medium">结束</th>
                <th className="py-2 pr-3 font-medium">来源 IP</th>
                <th className="py-2 pr-3 font-medium">认证</th>
                <th className="py-2 pr-3 font-medium">上行 / 下行</th>
                <th className="py-2 font-medium">断开原因</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr className="border-t border-border" key={session.gw_session_id ?? session.id ?? index}>
                  <td className="py-2 pr-3">{formatDateTime(session.started_at)}</td>
                  <td className="py-2 pr-3">{session.ended_at ? formatDateTime(session.ended_at) : "进行中"}</td>
                  <td className="py-2 pr-3 font-mono">{session.remote_ip}</td>
                  <td className="py-2 pr-3" title={session.key_fingerprint ?? undefined}>
                    {session.auth_method === "publickey" ? "公钥" : session.auth_method === "password" ? "密码" : session.auth_method}
                  </td>
                  <td className="py-2 pr-3">{formatBytes(session.bytes_up)} / {formatBytes(session.bytes_down)}</td>
                  <td className="py-2">{session.end_reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionQueryState>
    </ManagedSection>
  );
}
