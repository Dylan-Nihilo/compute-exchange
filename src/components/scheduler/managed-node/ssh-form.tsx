"use client";

import {Button, Input} from "@heroui/react";
import {useState} from "react";

import {errorMessage, isBackendRequestError} from "@/lib/api/envelope";
import {nodeSshInput, updateNodeSsh, type NodeOnboarding} from "@/lib/managed-nodes";
import {notify} from "@/lib/notify";

const fieldClass = "h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm";

/**
 * PUT /supplier/nodes/:id/ssh. Recommended path: the supplier appends the key line themselves and
 * submits `expected_host_fingerprint` so the very first connection is verified (no password ever).
 * The optional bootstrap password lives only in this component's state, is sent once in the PUT
 * body and cleared as soon as the request starts; it deliberately does not go through react-query,
 * whose mutation cache would retain the variables.
 */
export function SshForm({onboarding, onSaved}: {onboarding: NodeOnboarding; onSaved: () => void}) {
  const [host, setHost] = useState(onboarding.ssh_host ?? "");
  const [port, setPort] = useState(String(onboarding.ssh_port ?? 22));
  const [user, setUser] = useState(onboarding.ssh_user ?? "");
  const [fingerprint, setFingerprint] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const reconfigure = Boolean(onboarding.ssh_host);
  // A fingerprint is already pinned (confirmed, or preset when the node was created) unless host/port change.
  const pinned = onboarding.host_key.confirmed ? onboarding.host_key.fingerprint : null;
  const hostOrPortChanged = reconfigure && (host.trim() !== onboarding.ssh_host || Number(port) !== onboarding.ssh_port);
  const willBePinned = Boolean(fingerprint.trim()) || Boolean(pinned && !hostOrPortChanged);

  const submit = async () => {
    if (usePassword && !password) {
      setError("请填写一次性密码，或改为自行添加公钥行");
      return;
    }
    const parsed = nodeSshInput.safeParse({
      host,
      port: Number(port),
      user,
      bootstrap_password: usePassword && password ? password : undefined,
      expected_host_fingerprint: fingerprint,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查 SSH 信息");
      return;
    }
    setPassword("");
    setError("");
    setPending(true);
    try {
      const result = await updateNodeSsh(onboarding.node_id, parsed.data);
      notify.success(
        result.bootstrap === "installed"
          ? "SSH 信息已保存，管理公钥已写入"
          : reconfigure ? "SSH 信息已更新，节点需重新探活" : "SSH 信息已保存",
      );
      setUsePassword(false);
      setFingerprint("");
      onSaved();
    } catch (caught) {
      // 40001 after a failed bootstrap: connection info IS saved; 40900 fingerprint mismatch: password was never sent.
      const message = errorMessage(caught, "SSH 信息保存失败");
      setError(message);
      if (isBackendRequestError(caught) && (caught.code === 40900 || message.includes("连接信息已保存"))) onSaved();
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
          主机地址（公网 IP 或域名）
          <Input className={`mt-1 ${fieldClass}`} maxLength={253} onChange={(e) => setHost(e.target.value)} placeholder="例如 203.0.113.10" required value={host} />
        </label>
        <label className="text-xs font-medium text-muted">
          SSH 端口
          <Input className={`mt-1 ${fieldClass}`} inputMode="numeric" onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))} required value={port} />
        </label>
        <label className="text-xs font-medium text-muted">
          管理账户
          <Input autoComplete="off" className={`mt-1 ${fieldClass}`} maxLength={32} onChange={(e) => setUser(e.target.value)} placeholder="例如 omnis" required value={user} />
        </label>
      </div>
      <label className="block text-xs font-medium text-muted">
        预期主机指纹（推荐）
        <Input
          autoComplete="off"
          className={`mt-1 ${fieldClass} font-mono`}
          onChange={(e) => setFingerprint(e.target.value)}
          placeholder={pinned ? `已钉死 ${pinned}，留空保持不变` : "SHA256:…（留空则首次连接后再确认）"}
          value={fingerprint}
        />
        <span className="mt-1 block font-normal leading-5">
          在机器上执行 <code className="font-mono">{onboarding.host_key.check_command}</code>，填写输出的第二列。填写后平台首次连接即校验主机身份，不一致立即中止。
        </span>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-muted">管理公钥写入方式</legend>
        <label className="flex items-start gap-2 text-sm">
          <input checked={!usePassword} className="mt-1" name="key-install" onChange={() => {setUsePassword(false); setPassword("");}} type="radio" />
          我已把上方管理公钥行加入 authorized_keys（推荐，平台不接触密码）
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input checked={usePassword} className="mt-1" name="key-install" onChange={() => setUsePassword(true)} type="radio" />
          提供一次性密码，由平台登录一次写入公钥
        </label>
        {usePassword ? (
          <div className="space-y-1 pl-6">
            <Input
              aria-label="一次性登录密码"
              autoComplete="new-password"
              className={fieldClass}
              maxLength={256}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              value={password}
            />
            <p className="text-xs leading-5 text-muted">密码只随本次请求发送一次，平台写入公钥后立即丢弃，不保存、不记录日志；页面也不会保留。建议写入后修改该密码。</p>
            {!willBePinned ? (
              <p className="text-xs leading-5 text-warning" role="alert">
                未填写预期主机指纹：密码会在指纹确认之前发给首次握手到的主机。建议先填写预期指纹，或改为手动添加公钥行。
              </p>
            ) : (
              <p className="text-xs leading-5 text-muted">平台会在握手阶段先校验主机指纹，不一致即中止，密码不会发出。</p>
            )}
          </div>
        ) : null}
      </fieldset>
      {reconfigure ? (
        <p className="text-xs text-warning">
          修改 SSH 信息后节点会回到“待验证”，进行中的探活作废，需要重新探活{hostOrPortChanged ? "；主机地址或端口变化还会清除已钉死的指纹" : ""}。
        </p>
      ) : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <Button isPending={pending} type="submit">{pending ? "正在保存…" : reconfigure ? "更新 SSH 信息" : "保存 SSH 信息"}</Button>
    </form>
  );
}
