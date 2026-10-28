"use client";

import {Button, Input} from "@heroui/react";
import {useState} from "react";

import {errorMessage} from "@/lib/api/envelope";
import {nodeSshInput, updateNodeSsh} from "@/lib/managed-nodes";
import {notify} from "@/lib/notify";
import type {ComputeNode} from "@/lib/scheduler";

const fieldClass = "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm";

/**
 * docs/25 §25.4.2 step ④⑤. The optional bootstrap password lives only in this component's state,
 * is sent once in the PUT body and cleared as soon as the request starts. It deliberately does not
 * go through react-query, whose mutation cache would retain the variables.
 */
export function SshForm({node, onSaved}: {node: ComputeNode; onSaved: () => void}) {
  const [host, setHost] = useState(node.ssh_host ?? "");
  const [port, setPort] = useState(String(node.ssh_port ?? 22));
  const [user, setUser] = useState(node.ssh_user ?? "");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const reconfigure = Boolean(node.ssh_host);

  const submit = async () => {
    const parsed = nodeSshInput.safeParse({
      host,
      port: Number(port),
      user,
      bootstrap_password: usePassword && password ? password : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查 SSH 信息");
      return;
    }
    if (usePassword && !password) {
      setError("请填写一次性密码，或改为自行添加公钥");
      return;
    }
    setPassword("");
    setError("");
    setPending(true);
    try {
      await updateNodeSsh(node.id, parsed.data);
      notify.success(reconfigure ? "SSH 信息已更新，节点需重新探活" : "SSH 信息已保存");
      setUsePassword(false);
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught, "SSH 信息保存失败"));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) void submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_minmax(0,180px)]">
        <label className="text-xs font-medium text-muted">
          主机地址
          <Input className={`mt-1 ${fieldClass}`} maxLength={255} onChange={(e) => setHost(e.target.value)} placeholder="公网 IP 或域名" required value={host} />
        </label>
        <label className="text-xs font-medium text-muted">
          SSH 端口
          <Input className={`mt-1 ${fieldClass}`} inputMode="numeric" onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} required value={port} />
        </label>
        <label className="text-xs font-medium text-muted">
          管理账户
          <Input autoComplete="off" className={`mt-1 ${fieldClass}`} maxLength={64} onChange={(e) => setUser(e.target.value)} placeholder="例如 omnis" required value={user} />
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-muted">公钥写入方式</legend>
        <label className="flex items-start gap-2 text-sm">
          <input checked={!usePassword} className="mt-1" name="key-install" onChange={() => {setUsePassword(false); setPassword("");}} type="radio" />
          我已把上方管理公钥加入 authorized_keys（推荐）
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input checked={usePassword} className="mt-1" name="key-install" onChange={() => setUsePassword(true)} type="radio" />
          提供一次性密码，由平台登录一次写入公钥
        </label>
        {usePassword ? (
          <div className="pl-6">
            <Input
              aria-label="一次性登录密码"
              autoComplete="new-password"
              className={fieldClass}
              maxLength={256}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              value={password}
            />
            <p className="mt-1 text-xs leading-5 text-muted">密码只随本次请求发送一次，平台写入公钥后立即丢弃，不保存、不记录日志；页面也不会保留。建议写入后修改该密码。</p>
          </div>
        ) : null}
      </fieldset>
      {reconfigure ? <p className="text-xs text-warning">修改 SSH 信息后节点会回到“待验证”，需要重新探活。</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <Button isPending={pending} type="submit">{pending ? "正在保存…" : reconfigure ? "更新 SSH 信息" : "保存 SSH 信息"}</Button>
    </form>
  );
}
