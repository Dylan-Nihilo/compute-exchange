"use client";

import {Button, Input, Label, Modal, Spinner, TextArea, TextField} from "@heroui/react";
import {useEffect, useState} from "react";

import type {DeliverOrderInput, SupplierOrder} from "@/lib/supplier-workspace";

const inputClass =
  "h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";
const inputErrorClass =
  "h-10 rounded-xl border border-[#e5484d]/60 bg-[#fff7f7] px-3.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";

type FieldKey = "ipAddress" | "sshPort" | "username" | "password";

// 履约交付弹窗: 供给方回填实例访问凭证, 平台加密存储 (C-06)。
export function DeliverOrderModal({
  isPending = false,
  onCancel,
  onSubmit,
  open,
  order,
}: {
  isPending?: boolean;
  onCancel: () => void;
  onSubmit: (input: DeliverOrderInput) => void;
  open: boolean;
  order: SupplierOrder | null;
}) {
  const [ipAddress, setIpAddress] = useState("");
  const [sshPort, setSshPort] = useState("22");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  useEffect(() => {
    if (open) {
      setIpAddress("");
      setSshPort("22");
      setUsername("");
      setPassword("");
      setNote("");
      setErrors({});
    }
  }, [open]);

  const submit = () => {
    const nextErrors: Partial<Record<FieldKey, string>> = {};
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ipAddress.trim())) nextErrors.ipAddress = "请填写正确的 IP 地址";
    const port = Number(sshPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) nextErrors.sshPort = "端口 1-65535";
    if (!username.trim()) nextErrors.username = "请填写登录用户名";
    if (password.trim().length < 4) nextErrors.password = "密码至少 4 位";
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    onSubmit({
      ip_address: ipAddress.trim(),
      ssh_port: port,
      username: username.trim(),
      password: password.trim(),
      credential_note: note.trim() || undefined,
    });
  };

  return (
    <Modal.Root isOpen={open} onOpenChange={(isOpen) => { if (!isOpen && !isPending) onCancel(); }}>
      <Modal.Backdrop isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-xl">
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold text-[#173447]">
                回填交付凭证
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
              {order ? (
                <p className="rounded-xl border border-[#dce9ee] bg-white/55 px-4 py-2.5 text-xs text-[#78909c]">
                  订单 {order.order_no} · 数量 {order.quantity} · 金额 ¥{(order.total_amount / 100).toFixed(2)}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField fullWidth className="gap-1.5" value={ipAddress} variant="secondary" onChange={setIpAddress}>
                  <Label className="text-[13px] font-medium text-[#24495d]">实例 IP *</Label>
                  <Input className={errors.ipAddress ? inputErrorClass : inputClass} placeholder="例如: 10.20.30.40" />
                  {errors.ipAddress ? <p className="text-xs text-[#c4392f]" role="alert">{errors.ipAddress}</p> : null}
                </TextField>
                <TextField fullWidth className="gap-1.5" value={sshPort} variant="secondary" onChange={(v) => setSshPort(v.replace(/\D/g, ""))}>
                  <Label className="text-[13px] font-medium text-[#24495d]">SSH 端口 *</Label>
                  <Input className={errors.sshPort ? inputErrorClass : inputClass} inputMode="numeric" placeholder="22" />
                  {errors.sshPort ? <p className="text-xs text-[#c4392f]" role="alert">{errors.sshPort}</p> : null}
                </TextField>
                <TextField fullWidth className="gap-1.5" value={username} variant="secondary" onChange={setUsername}>
                  <Label className="text-[13px] font-medium text-[#24495d]">登录用户名 *</Label>
                  <Input autoComplete="off" className={errors.username ? inputErrorClass : inputClass} placeholder="例如: ubuntu / root" />
                  {errors.username ? <p className="text-xs text-[#c4392f]" role="alert">{errors.username}</p> : null}
                </TextField>
                <TextField fullWidth className="gap-1.5" value={password} variant="secondary" onChange={setPassword}>
                  <Label className="text-[13px] font-medium text-[#24495d]">登录密码 *</Label>
                  <Input autoComplete="new-password" className={errors.password ? inputErrorClass : inputClass} placeholder="实例登录密码" type="password" />
                  {errors.password ? <p className="text-xs text-[#c4392f]" role="alert">{errors.password}</p> : null}
                </TextField>
              </div>
              <TextField fullWidth className="gap-1.5" value={note} variant="secondary" onChange={setNote}>
                <Label className="text-[13px] font-medium text-[#24495d]">凭证备注</Label>
                <TextArea
                  className="rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 py-2.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]"
                  placeholder="控制台链接、密钥使用说明等补充信息(可选)"
                  rows={3}
                />
              </TextField>
              <p className="text-xs leading-5 text-[#9cb0ba]">
                凭证将加密存储, 仅在买家本人查看时脱敏/按需解密下发, 平台不留明文。
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button isDisabled={isPending} onPress={onCancel} variant="tertiary">
                取消
              </Button>
              <Button isPending={isPending} onPress={submit} variant="primary">
                {isPending ? (
                  <>
                    <Spinner aria-hidden="true" color="current" size="sm" />
                    正在交付
                  </>
                ) : (
                  "确认交付"
                )}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
