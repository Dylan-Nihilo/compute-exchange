"use client";

import {Button} from "@heroui/react";
import {keepPreviousData, useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {SectionQueryState} from "@/components/managed/query-states";
import {formatDateTime} from "@/lib/format/date";
import {fetchAccessSessions, formatBytes, SESSIONS_PAGE_SIZE} from "@/lib/managed-orders";

import {ManagedSection} from "./managed-section";

/** Gateway session audit for this lease (metadata only; content is never recorded). Paged, newest first. */
export function ManagedSessionsCard({orderNo}: {orderNo: string}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["buyer", "orders", "managed-sessions", orderNo, page],
    queryFn: () => fetchAccessSessions(orderNo, page),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const sessions = query.data?.list ?? [];
  const total = query.data?.total ?? 0;
  const pageSize = query.data?.page_size ?? SESSIONS_PAGE_SIZE;
  const pages = Math.max(1, Math.ceil(total / pageSize));

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
          <table className="w-full min-w-[720px] text-left text-xs">
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
              {sessions.map((session) => (
                <tr className="border-t border-border" key={session.id}>
                  <td className="py-2 pr-3">{formatDateTime(session.started_at)}</td>
                  <td className="py-2 pr-3">{session.ended_at ? formatDateTime(session.ended_at) : "进行中"}</td>
                  <td className="py-2 pr-3 font-mono">{session.remote_ip}</td>
                  <td className="py-2 pr-3" title={session.key_fingerprint ?? undefined}>
                    {authLabel(session.auth_method, session.key_name)}
                  </td>
                  <td className="py-2 pr-3">{formatBytes(session.bytes_up)} / {formatBytes(session.bytes_down)}</td>
                  <td className="py-2">{session.end_reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 ? (
          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted">
            <span>第 {page} / {pages} 页，共 {total} 条</span>
            <Button isDisabled={page <= 1 || query.isFetching} size="sm" variant="outline" onPress={() => setPage((value) => value - 1)}>上一页</Button>
            <Button isDisabled={page >= pages || query.isFetching} size="sm" variant="outline" onPress={() => setPage((value) => value + 1)}>下一页</Button>
          </div>
        ) : null}
      </SectionQueryState>
    </ManagedSection>
  );
}

function authLabel(method: string, keyName: string | null) {
  if (method === "publickey") return keyName ? `公钥（${keyName}）` : "公钥";
  if (method === "password") return "密码";
  return method;
}
