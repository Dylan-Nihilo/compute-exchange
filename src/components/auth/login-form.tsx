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
  TextField,
  toast,
  Typography,
} from "@heroui/react";
import {Segment} from "@heroui-pro/react/segment";
import Image from "next/image";
import {useRouter, useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";

import {
  useLogin,
  useRequestEmailCode,
  useRequestSmsCode,
} from "@/lib/auth/queries";
import {safeNextPath} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import type {
  LoginInput,
  SessionAccount,
  VerificationMethod,
} from "@/lib/auth/service";
import type {Role} from "@/lib/domain/contracts";
import {homeForRole, matchRoute} from "@/lib/domain/routes";
import {FormError, FormHeading, VerificationCodeField} from "./form-parts";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutation = useLogin();
  const smsMutation = useRequestSmsCode("login");
  const emailMutation = useRequestEmailCode();
  const selectRole = useAuthStore((state) => state.selectRole);
  const [method, setMethod] = useState<VerificationMethod>("sms");
  const [identifier, setIdentifier] = useState("");
  const [remember, setRemember] = useState(true);
  const [resendSeconds, setResendSeconds] = useState(0);
  const nextPath = safeNextPath(searchParams.get("next"));
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
    const code = String(form.get("code"));
    const credentials: LoginInput =
      method === "sms"
        ? {method, phoneNumber: identifier, code}
        : {method, email: identifier, code};

    const account = await mutation
      .mutateAsync({credentials, remember})
      .catch(() => null);
    if (!account) return;

    const role = destinationRole(account, nextPath);
    selectRole(role, account.roles);
    toast.success("登录成功");
    router.replace(nextPath ?? homeForRole(role));
  }

  async function sendCode(captchaToken: string) {
    const result = await (method === "sms"
      ? smsMutation.mutateAsync({phoneNumber: identifier, captchaToken})
      : emailMutation.mutateAsync({email: identifier, captchaToken})
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
    setIdentifier("");
    setResendSeconds(0);
    mutation.reset();
    smsMutation.reset();
    emailMutation.reset();
  }

  const identifierIsValid =
    method === "sms"
      ? /^1\d{10}$/.test(identifier)
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

  return (
    <>
      <FormHeading
        compact
        description="请使用手机号或邮箱验证码登录"
        title="登录"
      />
      <Segment
        aria-label="登录方式"
        className="mb-3 w-full rounded-[13px] bg-[rgba(232,242,246,0.52)] p-[3px] [&_[data-slot=segment-indicator]]:rounded-[10px] [&_[data-slot=segment-indicator]]:bg-[rgba(226,241,246,0.96)] [&_[data-slot=segment-item]]:h-[34px] [&_[data-slot=segment-item]]:flex-1 [&_[data-slot=segment-item]]:rounded-[10px]"
        onSelectionChange={(key) => switchMethod(key as VerificationMethod)}
        selectedKey={method}
        size="lg"
      >
        <Segment.Item id="sms">手机号登录</Segment.Item>
        <Segment.Item id="email">邮箱登录</Segment.Item>
      </Segment>

      <Form className="space-y-3" onSubmit={submit}>
        <FormError
          error={mutation.error ?? smsMutation.error ?? emailMutation.error}
        />
        <TextField
          fullWidth
          inputMode={method === "sms" ? "numeric" : "email"}
          isRequired
          maxLength={method === "sms" ? 11 : 120}
          name="identifier"
          onChange={setIdentifier}
          type={method === "sms" ? "tel" : "email"}
          validate={(value) => {
            const valid =
              method === "sms"
                ? /^1[0-9]{10}$/.test(value)
                : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            return valid
              ? null
              : method === "sms"
                ? "请输入正确的 11 位手机号"
                : "请输入正确的邮箱地址";
          }}
          value={identifier}
          variant="secondary"
        >
          <Label className="text-[13px] text-[#315064]">
            {method === "sms" ? "手机号" : "邮箱"}
          </Label>
          <Input
            autoComplete={method === "sms" ? "tel" : "email"}
            className="h-[50px] rounded-[13px] border border-[rgba(183,205,215,0.44)] bg-[rgba(251,253,254,0.94)] px-3 text-sm text-[#173d52] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
            id="login-identifier"
            placeholder={method === "sms" ? "请输入手机号" : "请输入邮箱"}
          />
          <FieldError />
        </TextField>

        <VerificationCodeField
          canSend={identifierIsValid}
          id="login-code"
          isPending={codeMutation.isPending}
          onSend={sendCode}
          resendSeconds={resendSeconds}
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
          isPending={mutation.isPending}
          type="submit"
          variant="primary"
        >
          登录
        </Button>
      </Form>

      <p className="mt-3 text-center text-[13px] leading-5 text-[#526f7f]">
        还没有账号？{" "}
        <Link className="font-medium text-[#2c6b88]" href="/auth/register">
          注册
        </Link>
      </p>

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
        onPress={() => toast.info("微信扫码登录将在开放平台配置后启用")}
        variant="outline"
      >
        <Image alt="" height={20} src="/auth/wechat.svg" width={20} />
        微信扫码登录
      </Button>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-[#708895]">
        <Image alt="" height={14} src="/auth/lock.svg" width={14} />
        <span>安全验证，保障账号与交易信息安全</span>
      </div>
    </>
  );
}

function destinationRole(
  account: SessionAccount,
  nextPath: string | null,
): Exclude<Role, "guest"> {
  const route = nextPath ? matchRoute(nextPath) : null;
  const routeRole = route?.roles.find(
    (role): role is Exclude<Role, "guest"> =>
      role !== "guest" && account.roles.includes(role),
  );
  return routeRole ?? account.roles[0];
}
