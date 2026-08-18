"use client";

import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  TextField,
  toast,
  Typography,
} from "@heroui/react";
import {Segment} from "@heroui-pro/react/segment";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

import {
  useRegister,
  useRegisterSms,
  useRequestEmailCode,
  useRequestSmsCode,
} from "@/lib/auth/queries";
import type {VerificationMethod} from "@/lib/auth/service";
import {FormError, FormHeading, VerificationCodeField} from "./form-parts";

export function RegisterForm() {
  const router = useRouter();
  const mutation = useRegister();
  const smsRegisterMutation = useRegisterSms();
  const smsMutation = useRequestSmsCode("register");
  const emailMutation = useRequestEmailCode();
  const [method, setMethod] = useState<VerificationMethod>("sms");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const codeMutation = method === "sms" ? smsMutation : emailMutation;

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
    const form = new FormData(event.currentTarget);
    if (method === "sms") {
      const result = await smsRegisterMutation
        .mutateAsync({
          phoneNumber,
          code: String(form.get("code")),
          password: String(form.get("password")),
        })
        .catch(() => null);
      if (!result) return;
      toast.success("账户已创建，请登录");
      router.replace("/auth/login?registered=1");
      return;
    }

    const account = await mutation
      .mutateAsync({
        method,
        displayName: String(form.get("displayName")),
        email,
        phoneNumber,
        code: String(form.get("code")),
      })
      .catch(() => null);
    if (!account) return;
    toast.success("账户已创建");
    router.replace("/auth/verify");
  }

  async function sendCode(captchaToken: string) {
    const result = await (method === "sms"
      ? smsMutation.mutateAsync({phoneNumber, captchaToken})
      : emailMutation.mutateAsync({email, captchaToken})
    ).catch(() => null);
    if (!result) return false;
    setResendSeconds(result.resendAfterSeconds);
    toast.success(
      "previewCode" in result
        ? `验证码已发送，演示验证码：${result.previewCode}`
        : "验证码已发送",
    );
    return true;
  }

  function switchMethod(nextMethod: VerificationMethod) {
    setMethod(nextMethod);
    setResendSeconds(0);
    mutation.reset();
    smsRegisterMutation.reset();
    smsMutation.reset();
    emailMutation.reset();
  }

  const targetIsValid =
    method === "sms"
      ? /^1\d{10}$/.test(phoneNumber)
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <>
      <FormHeading
        compact
        description="验证手机号或邮箱后创建平台账户"
        title="注册"
      />
      <Segment
        aria-label="注册验证方式"
        className="mb-3 w-full rounded-[13px] bg-[rgba(232,242,246,0.52)] p-[3px] [&_[data-slot=segment-indicator]]:rounded-[10px] [&_[data-slot=segment-indicator]]:bg-[rgba(226,241,246,0.96)] [&_[data-slot=segment-item]]:h-[34px] [&_[data-slot=segment-item]]:flex-1 [&_[data-slot=segment-item]]:rounded-[10px]"
        onSelectionChange={(key) => switchMethod(key as VerificationMethod)}
        selectedKey={method}
        size="lg"
      >
        <Segment.Item id="sms">手机验证</Segment.Item>
        <Segment.Item id="email">邮箱验证</Segment.Item>
      </Segment>

      <Form className="space-y-3" onSubmit={submit}>
        <FormError
          error={
            mutation.error ??
            smsRegisterMutation.error ??
            smsMutation.error ??
            emailMutation.error
          }
        />
        {method === "email" ? (
          <TextField
            fullWidth
            isRequired
            maxLength={40}
            name="displayName"
            validate={(value) =>
              value.trim().length >= 2 ? null : "账户名称至少需要 2 个字符"
            }
            variant="secondary"
          >
            <Label className="text-[13px] text-[#315064]">账户名称</Label>
            <Input
              autoComplete="name"
              className="h-[50px] rounded-[13px] border border-[rgba(183,205,215,0.44)] bg-[rgba(251,253,254,0.94)] px-3 text-sm text-[#173d52]"
              id="register-name"
              placeholder="企业或个人名称"
            />
            <FieldError />
          </TextField>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            fullWidth
            inputMode="numeric"
            isRequired
            maxLength={11}
            name="phoneNumber"
            onChange={setPhoneNumber}
            type="tel"
            validate={(value) =>
              /^1[0-9]{10}$/.test(value) ? null : "请输入正确的 11 位手机号"
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
          {method === "email" ? (
            <TextField
              fullWidth
              isRequired
              name="email"
              onChange={setEmail}
              type="email"
              validate={(value) =>
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
                  ? null
                  : "请输入正确的邮箱地址"
              }
              value={email}
              variant="secondary"
            >
              <Label className="text-[13px] text-[#315064]">邮箱</Label>
              <Input
                autoComplete="email"
                className="h-[50px] rounded-[13px] border border-[rgba(183,205,215,0.44)] bg-[rgba(251,253,254,0.94)] px-3 text-sm text-[#173d52]"
                id="register-email"
                placeholder="name@company.com"
              />
              <FieldError />
            </TextField>
          ) : (
            <TextField
              fullWidth
              isRequired
              minLength={8}
              name="password"
              validate={(value) =>
                value.length >= 8 ? null : "密码至少需要 8 个字符"
              }
              variant="secondary"
            >
              <Label className="text-[13px] text-[#315064]">登录密码</Label>
              <Input
                autoComplete="new-password"
                className="h-[50px] rounded-[13px] border border-[rgba(183,205,215,0.44)] bg-[rgba(251,253,254,0.94)] px-3 text-sm text-[#173d52]"
                id="register-password"
                placeholder="至少 8 个字符"
                type="password"
              />
              <FieldError />
            </TextField>
          )}
        </div>

        <VerificationCodeField
          canSend={targetIsValid}
          id="register-code"
          isPending={codeMutation.isPending}
          onSend={sendCode}
          resendSeconds={resendSeconds}
        />

        <Typography className="leading-5 text-[#708895]" type="body-xs">
          创建账户即表示你同意平台服务条款与隐私规则。
        </Typography>
        <Button
          className="h-12 rounded-xl border border-[rgba(221,243,168,0.62)] bg-[#c4ec68] text-sm font-medium text-[#112c32] shadow-[0_6px_14px_rgba(125,171,54,0.16)] hover:bg-[#bce35f]"
          fullWidth
          isPending={mutation.isPending || smsRegisterMutation.isPending}
          type="submit"
          variant="primary"
        >
          创建账户
        </Button>
      </Form>

      <p className="mt-3 text-center text-[13px] leading-5 text-[#526f7f]">
        已有账户？{" "}
        <Link className="font-medium text-[#2c6b88]" href="/auth/login">
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
