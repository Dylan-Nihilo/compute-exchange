"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";

import {SectionQueryState} from "@/components/managed/query-states";
import {ConfirmDialog} from "@/components/system/confirm-dialog";
import {AddSshKeyForm} from "@/components/workspace/buyer/ssh-keys/add-ssh-key-form";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {deleteSshKey, fetchSshKeys, MAX_SSH_KEYS, sshKeyTypeLabels, type SshKey} from "@/lib/buyer-ssh-keys";
import {formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";

const keysKey = ["buyer", "ssh-keys"] as const;

export default function BuyerSshKeysPage() {
  const queryClient = useQueryClient();
  const query = useQuery({queryKey: keysKey, queryFn: () => fetchSshKeys(), retry: false});
  const [removing, setRemoving] = useState<SshKey | null>(null);
  const remove = useMutation({
    mutationFn: (key: SshKey) => deleteSshKey(key.id),
    onSuccess: async () => {
      setRemoving(null);
      notify.success("公钥已删除，新连接将不再接受该公钥");
      await queryClient.invalidateQueries({queryKey: keysKey});
    },
    onError: (error) => notify.error(error.message),
  });
  const keys = query.data ?? [];
  const full = keys.length >= MAX_SSH_KEYS;

  return (
    <section className="mx-auto w-full max-w-[1228px] space-y-5 px-4 pt-8 pb-10 sm:px-6 xl:px-8">
      <WorkspacePageHeader title="SSH 公钥" />
      <p className="text-sm text-muted">
        用于登录平台托管的算力租约（经平台访问网关）。公钥对名下全部托管租约生效，最多 {MAX_SSH_KEYS} 把。
      </p>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold">已添加的公钥</h2>
          <SectionQueryState
            emptyText="还没有添加公钥。也可以使用订单访问凭证中的密码登录。"
            error={query.error}
            isEmpty={keys.length === 0}
            isError={query.isError}
            isPending={query.isPending}
            isRefetching={query.isFetching}
            loadingText="正在读取公钥"
            notOpenText="SSH 公钥管理接口暂未开放。"
            onRetry={() => void query.refetch()}
          >
            <ul className="mt-3 divide-y divide-border">
              {keys.map((key) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={key.id}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {key.name}
                      <span className="ml-2 text-xs font-normal text-muted">{sshKeyTypeLabels[key.key_type] ?? key.key_type}</span>
                    </p>
                    <p className="mt-1 font-mono text-xs break-all text-muted">{key.fingerprint}</p>
                    <p className="mt-1 text-xs text-muted">添加于 {formatDateTime(key.created_at)}</p>
                  </div>
                  <Button size="sm" variant="outline" onPress={() => setRemoving(key)}>删除</Button>
                </li>
              ))}
            </ul>
          </SectionQueryState>
        </GlassCard>
        <GlassCard className="p-5">
          <h2 className="mb-3 text-base font-semibold">添加公钥</h2>
          {full ? <p className="mb-3 text-sm text-warning">已达到 {MAX_SSH_KEYS} 把上限，请先删除不再使用的公钥。</p> : null}
          <AddSshKeyForm
            disabled={full || query.isError}
            onAdded={() => void queryClient.invalidateQueries({queryKey: keysKey})}
          />
        </GlassCard>
      </div>
      <ConfirmDialog
        confirmLabel="删除公钥"
        description={`删除「${removing?.name ?? ""}」后，使用该公钥的新连接将被拒绝。`}
        isDestructive
        isPending={remove.isPending}
        open={removing !== null}
        title="删除 SSH 公钥"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) remove.mutate(removing);
        }}
      />
    </section>
  );
}
