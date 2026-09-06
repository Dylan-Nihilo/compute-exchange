"use client";

import {
  Button,
  Checkbox,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  Separator,
  Spinner,
  TextField,
  Typography,
} from "@heroui/react";
import {Segment} from "@heroui-pro/react/segment";
import Image from "next/image";
import {useRouter, useSearchParams} from "next/navigation";
import {useMutation, useQuery} from "@tanstack/react-query";
import {useEffect, useState} from "react";

import {useLogin, useRequestSmsCode} from "@/lib/auth/queries";
import {resolvePostAuthDestination, safeNextPath} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {FormError, FormHeading, VerificationCodeField} from "./form-parts";

export function LoginForm({wechatBinding = false}: {wechatBinding?: boolean} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutation = useLogin();
  const wechatStatus = useQuery({queryKey: ["auth", "wechat", "status"], enabled: !wechatBinding, retry: false, queryFn: async () => {
    const response = await fetch("/api/auth/wechat", {cache: "no-store"});
    const payload = await response.json();
    return response.ok && payload.code === 0 && payload.data?.enabled === true;
  }});
  const wechatLogin = useMutation({mutationFn: async () => {
    const response = await fetch("/api/auth/wechat", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({next: nextPath, remember})});
    const payload = await response.json();
    if (!response.ok || payload.code !== 0) throw new Error(payload.message || "微信登录暂不可用");
    window.location.assign(payload.data.authorize_url);
  }});
  const smsMutation = useRequestSmsCode("login");
  const selectRole = useAuthStore((state) => state.selectRole);
  const [identifier, setIdentifier] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [resendSeconds, setResendSeconds] = useState(0);
  const nextPath = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1_000,
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = await mutation
      .mutateAsync({
        phoneNumber: identifier,
        code: verificationCode,
        remember,
        wechatBinding,
      })
      .catch(() => null);
    if (!account) return;

    const {path, role} = resolvePostAuthDestination(account, nextPath);
    selectRole(role, account.roles);
    router.replace(path);
  }

  async function sendCode(captchaToken: string) {
    const result = await smsMutation
      .mutateAsync({phoneNumber: identifier, captchaToken})
      .catch(() => null);
    if (!result) return null;
    setResendSeconds(result.resendAfterSeconds);
    return result;
  }

  const identifierIsValid = /^1[3-9]\d{9}$/.test(identifier);
  const canSubmit = identifierIsValid && /^[0-9]{6}$/.test(verificationCode);

  return (
    <>
      <FormHeading
        compact
        description={wechatBinding ? "验证手机号，将微信绑定到已有账户" : "请使用手机号验证码登录"}
        title={wechatBinding ? "绑定微信" : "登录"}
      />
      <Segment
        aria-label="登录方式"
        className="mb-3 w-full rounded-[13px] bg-[rgba(232,242,246,0.52)] p-[3px] [&_[data-slot=segment-indicator]]:rounded-[10px] [&_[data-slot=segment-indicator]]:bg-[rgba(226,241,246,0.96)] [&_[data-slot=segment-item]]:h-[34px] [&_[data-slot=segment-item]]:flex-1 [&_[data-slot=segment-item]]:rounded-[10px]"
        selectedKey="sms"
        size="lg"
      >
        <Segment.Item id="sms">手机号登录</Segment.Item>
        <Segment.Item id="email" isDisabled>
          邮箱登录 · 待开放
        </Segment.Item>
      </Segment>

      <Form className="space-y-3" onSubmit={submit}>
        <FormError error={mutation.error ?? smsMutation.error ?? wechatLogin.error ?? (searchParams.get("wechat_error") ? new Error("微信授权未完成或已失效，请重新扫码") : null)} />
        <TextField
          fullWidth
          inputMode="numeric"
          isRequired
          maxLength={11}
          name="identifier"
          onChange={setIdentifier}
          type="tel"
          validate={(value) =>
            /^1[3-9][0-9]{9}$/.test(value) ? null : "请输入正确的 11 位手机号"
          }
          value={identifier}
          variant="secondary"
        >
          <Label className="text-[13px] text-[#315064]">手机号</Label>
          <Input
            autoComplete="tel"
            className="h-[50px] rounded-[13px] border border-[rgba(183,205,215,0.44)] bg-[rgba(251,253,254,0.94)] px-3 text-sm text-[#173d52] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
            id="login-identifier"
            placeholder="请输入手机号"
          />
          <FieldError />
        </TextField>

        <VerificationCodeField
          canSend={identifierIsValid}
          id="login-code"
          isPending={smsMutation.isPending}
          onChange={setVerificationCode}
          onSend={sendCode}
          resendSeconds={resendSeconds}
          value={verificationCode}
        />

        <Checkbox
          className="text-[13px] text-[#4e6c7c]"
          isSelected={remember}
          name="remember"
          onChange={setRemember}
        >
          <Checkbox.Content>
            <Checkbox.Control className="size-4 rounded-[5px] before:bg-[#c4ec68]">
              <Checkbox.Indicator />
            </Checkbox.Control>
            保持登录
          </Checkbox.Content>
        </Checkbox>

        <Button
          className="h-12 rounded-xl border border-[rgba(221,243,168,0.62)] bg-[#c4ec68] text-sm font-medium text-[#112c32] shadow-[0_6px_14px_rgba(125,171,54,0.16)] hover:bg-[#bce35f]"
          fullWidth
          isDisabled={!canSubmit}
          isPending={mutation.isPending}
          type="submit"
          variant="primary"
        >
          {mutation.isPending ? (
            <>
              <Spinner aria-hidden="true" color="current" size="sm" />
              正在登录
            </>
          ) : (
            wechatBinding ? "登录并绑定微信" : "登录"
          )}
        </Button>
      </Form>

      <p className="mt-3 text-center text-[13px] leading-5 text-[#526f7f]">
        还没有账号？{" "}
        <Link
          className="font-medium text-[#2c6b88]"
          href={wechatBinding ? `/auth/wechat/bind?mode=register${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}` : nextPath ? `/auth/register?next=${encodeURIComponent(nextPath)}` : "/auth/register"}
        >
          注册
        </Link>
      </p>

      {!wechatBinding && <>
      <div className="my-3 flex items-center gap-2" aria-hidden="true">
        <Separator className="flex-1 bg-[rgba(113,151,169,0.16)]" />
        <Typography className="w-[100px] text-center text-xs text-[#748d9a]" type="body-xs">
          其他登录方式
        </Typography>
        <Separator className="flex-1 bg-[rgba(113,151,169,0.16)]" />
      </div>

      <Button
        className="h-11 rounded-full border border-[rgba(188,210,220,0.46)] bg-[rgba(251,253,254,0.94)] text-sm font-medium text-[#234a5f] shadow-[inset_0_1px_1px_rgba(255,255,255,0.62)]"
        fullWidth
        isDisabled={!wechatStatus.data}
        isPending={wechatLogin.isPending}
        onPress={() => wechatLogin.mutate()}
        variant="outline"
      >
        <Image alt="" height={20} src="/auth/wechat.svg" width={20} />
        {wechatStatus.data ? "微信扫码登录" : "微信扫码登录 · 待开放"}
      </Button>
      </>}
      {wechatBinding && <Link className="mt-3 block text-center text-sm" href={nextPath ? `/auth/login?next=${encodeURIComponent(nextPath)}` : "/auth/login"}>返回登录</Link>}

      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#708895]">
        <Image alt="" height={14} src="/auth/lock.svg" width={14} />
        <span>安全验证，保障账号与交易信息安全</span>
      </div>
    </>
  );
}
