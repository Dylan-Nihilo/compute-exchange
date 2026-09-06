"use client";

import {LegalLink} from "@/components/legal/legal-link";

import {
  Button,
  Checkbox,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  Spinner,
  TextField,
} from "@heroui/react";
import {Segment} from "@heroui-pro/react/segment";
import Image from "next/image";
import {useRouter, useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";

import {useRegisterSms, useRequestSmsCode} from "@/lib/auth/queries";
import {resolvePostAuthDestination, safeNextPath} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {FormError, FormHeading, VerificationCodeField} from "./form-parts";

export function RegisterForm({wechatBinding = false}: {wechatBinding?: boolean} = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const smsRegisterMutation = useRegisterSms();
  const smsMutation = useRequestSmsCode("register");
  const selectRole = useAuthStore((state) => state.selectRole);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [agreeTos, setAgreeTos] = useState(false);
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
    if (!agreeTos) return;
    const account = await smsRegisterMutation
      .mutateAsync({
        phoneNumber,
        code: verificationCode,
        agreeTos,
        remember: true,
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
      .mutateAsync({phoneNumber, captchaToken})
      .catch(() => null);
    if (!result) return null;
    setResendSeconds(result.resendAfterSeconds);
    return result;
  }

  const targetIsValid = /^1[3-9]\d{9}$/.test(phoneNumber);
  const canSubmit =
    targetIsValid && /^[0-9]{6}$/.test(verificationCode) && agreeTos;

  return (
    <>
      <FormHeading
        compact
        description={wechatBinding ? "验证手机号，创建账户并绑定微信" : "验证手机号后创建平台账户"}
        title={wechatBinding ? "绑定新账户" : "注册"}
      />
      <Segment
        aria-label="注册验证方式"
        className="mb-3 w-full rounded-[13px] bg-[rgba(232,242,246,0.52)] p-[3px] [&_[data-slot=segment-indicator]]:rounded-[10px] [&_[data-slot=segment-indicator]]:bg-[rgba(226,241,246,0.96)] [&_[data-slot=segment-item]]:h-[34px] [&_[data-slot=segment-item]]:flex-1 [&_[data-slot=segment-item]]:rounded-[10px]"
        selectedKey="sms"
        size="lg"
      >
        <Segment.Item id="sms">手机验证</Segment.Item>
        <Segment.Item id="email" isDisabled>
          邮箱验证 · 待开放
        </Segment.Item>
      </Segment>

      <Form className="space-y-3" onSubmit={submit}>
        <FormError error={smsRegisterMutation.error ?? smsMutation.error} />
        <div>
          <TextField
            fullWidth
            inputMode="numeric"
            isRequired
            maxLength={11}
            name="phoneNumber"
            onChange={setPhoneNumber}
            type="tel"
            validate={(value) =>
              /^1[3-9][0-9]{9}$/.test(value) ? null : "请输入正确的 11 位手机号"
            }
            value={phoneNumber}
            variant="secondary"
          >
            <Label className="text-[13px] text-[#315064]">手机号</Label>
            <Input
              autoComplete="tel"
              className="h-[50px] rounded-[13px] border border-[rgba(183,205,215,0.44)] bg-[rgba(251,253,254,0.94)] px-3 text-sm text-[#173d52]"
              id="register-phone"
              placeholder="11 位手机号"
            />
            <FieldError />
          </TextField>
        </div>

        <VerificationCodeField
          canSend={targetIsValid}
          id="register-code"
          isPending={smsMutation.isPending}
          onChange={setVerificationCode}
          onSend={sendCode}
          resendSeconds={resendSeconds}
          value={verificationCode}
        />

        <Checkbox
          className="text-[13px] leading-5 text-[#4e6c7c]"
          isRequired
          isSelected={agreeTos}
          name="agreeTos"
          onChange={setAgreeTos}
        >
          <Checkbox.Content>
            <Checkbox.Control className="size-4 rounded-[5px] before:bg-[#c4ec68]">
              <Checkbox.Indicator />
            </Checkbox.Control>
            <span>我已阅读并同意<LegalLink document="terms" />和<LegalLink document="privacy" /></span>
          </Checkbox.Content>
        </Checkbox>
        <Button
          className="h-12 rounded-xl border border-[rgba(221,243,168,0.62)] bg-[#c4ec68] text-sm font-medium text-[#112c32] shadow-[0_6px_14px_rgba(125,171,54,0.16)] hover:bg-[#bce35f]"
          fullWidth
          isDisabled={!canSubmit}
          isPending={smsRegisterMutation.isPending}
          type="submit"
          variant="primary"
        >
          {smsRegisterMutation.isPending ? (
            <>
              <Spinner aria-hidden="true" color="current" size="sm" />
              正在创建
            </>
          ) : (
            wechatBinding ? "创建账户并绑定微信" : "创建账户"
          )}
        </Button>
      </Form>

      <p className="mt-3 text-center text-[13px] leading-5 text-[#526f7f]">
        已有账户？{" "}
        <Link
          className="font-medium text-[#2c6b88]"
          href={wechatBinding ? `/auth/wechat/bind?mode=login${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}` : nextPath ? `/auth/login?next=${encodeURIComponent(nextPath)}` : "/auth/login"}
        >
          登录
        </Link>
      </p>
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#708895]">
        <Image alt="" height={14} src="/auth/lock.svg" width={14} />
        <span>安全验证，保障账号与交易信息安全</span>
      </div>
    </>
  );
}
