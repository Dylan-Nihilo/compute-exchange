"use client";

import {Button} from "@heroui/react";
import {useMutation} from "@tanstack/react-query";
import {useState} from "react";

import {addSshKey, sshKeyInput, type SshKeyInput} from "@/lib/buyer-ssh-keys";
import {notify} from "@/lib/notify";

const fieldClass = "w-full rounded-xl border border-border bg-surface px-3 text-sm";

/** Adds one public key. Backend 40001 (format/strength) and 40900 (over 10 keys) show as returned. */
export function AddSshKeyForm({disabled, onAdded}: {disabled: boolean; onAdded: () => void}) {
  const [name, setName] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [localError, setLocalError] = useState("");
  const add = useMutation({
    mutationFn: (input: SshKeyInput) => addSshKey(input),
    onSuccess: () => {
      setName("");
      setPublicKey("");
      notify.success("公钥已添加，对名下全部托管租约生效");
      onAdded();
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = sshKeyInput.safeParse({name, public_key: publicKey});
        if (!parsed.success) {
          setLocalError(parsed.error.issues[0]?.message ?? "请检查公钥内容");
          return;
        }
        setLocalError("");
        add.mutate(parsed.data);
      }}
    >
      <label className="block text-sm">
        <span className="text-muted">名称</span>
        <input
          className={`${fieldClass} mt-1 h-10`}
          disabled={disabled || add.isPending}
          maxLength={64}
          placeholder="例如：办公室 MacBook"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">公钥（.pub 文件内容）</span>
        <textarea
          className={`${fieldClass} mt-1 min-h-24 py-2 font-mono text-xs`}
          disabled={disabled || add.isPending}
          placeholder="ssh-ed25519 AAAAC3Nza... user@host"
          spellCheck={false}
          value={publicKey}
          onChange={(event) => setPublicKey(event.target.value)}
        />
      </label>
      <p className="text-xs text-muted">
        生成方式：<code className="font-mono">ssh-keygen -t ed25519</code>，然后粘贴 <code className="font-mono">~/.ssh/id_ed25519.pub</code> 的内容。请勿粘贴私钥。
      </p>
      {localError ? <p className="text-sm text-danger" role="alert">{localError}</p> : null}
      {add.isError ? <p className="text-sm text-danger" role="alert">{add.error.message}</p> : null}
      <Button isDisabled={disabled} isPending={add.isPending} type="submit">添加公钥</Button>
    </form>
  );
}
