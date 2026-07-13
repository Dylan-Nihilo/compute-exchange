"use client";

import {
  AlertDialog,
  Button,
  Description,
  FieldError,
  Form,
  Input,
  InputOTP,
  Label,
  Link,
  Separator,
  TextField,
  toast,
  Typography,
} from "@heroui/react";
import {Segment} from "@heroui-pro/react/segment";
import {useRouter, useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";

import {
  useDemoAccounts,
  useLogin,
  useRequestSmsCode,
  useResetDemo,
} from "@/lib/auth/queries";
import {safeNextPath} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import type {Role} from "@/lib/domain/contracts";
import {homeForRole, matchRoute} from "@/lib/domain/routes";
import type {LoginInput, SessionAccount} from "@/lib/auth/service";
import {FormError, FormHeading, SliderVerification} from "./form-parts";

const roleLabels: Partial<Record<Role, string>> = {
  buyer: "买家",
  supplier: "供给方",
  vendor: "设备厂商",
  funder: "资方",
  operator: "平台运营",
  admin: "管理员",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutation = useLogin();
  const smsMutation = useRequestSmsCode();
  const resetMutation = useResetDemo();
  const demoAccounts = useDemoAccounts();
  const selectRole = useAuthStore((state) => state.selectRole);
  const [pendingDemo, setPendingDemo] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [method, setMethod] = useState<"password" | "sms">("password");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const nextPath = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds((seconds) => Math.max(0, seconds - 1)),
      1_000,
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  async function authenticate(
    input: LoginInput,
    preferredRole?: Role,
  ) {
    const account = await mutation.mutateAsync(input);
    const role = destinationRole(account, nextPath, preferredRole);
    selectRole(role, account.roles);
    toast.success("登录成功");
    router.replace(nextPath ?? homeForRole(role));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: LoginInput =
      method === "password"
        ? {
            method,
            identifier: String(form.get("identifier")),
            password: String(form.get("password")),
            sliderVerified: sliderValue === 100,
          }
        : {
            method,
            phoneNumber,
            code: String(form.get("code")),
          };
    await authenticate(input).catch(() => {
      if (method === "password") setSliderValue(0);
    });
  }

  async function sendCode() {
    await smsMutation
      .mutateAsync({phoneNumber, sliderVerified: sliderValue === 100})
      .then(({resendAfterSeconds}) => {
        setResendSeconds(resendAfterSeconds);
        setSliderValue(0);
        toast.success("验证码已发送");
      })
      .catch(() => setSliderValue(0));
  }

  function switchMethod(nextMethod: "password" | "sms") {
    setMethod(nextMethod);
    setSliderValue(0);
    mutation.reset();
    smsMutation.reset();
  }

  async function enterDemo(email: string, role: Role) {
    setPendingDemo(email);
    await authenticate(
      {
        method: "password",
        identifier: email,
        password: "demo1234",
        sliderVerified: true,
      },
      role,
    ).catch(() => undefined);
    setPendingDemo(null);
  }

  return (
    <>
      <FormHeading
        description="登录后进入当前身份对应的工作台。"
        eyebrow="账户"
        title="登录账户"
      />
      <Segment
        aria-label="登录方式"
        className="mb-6 w-full"
        onSelectionChange={(key) => switchMethod(key as "password" | "sms")}
        selectedKey={method}
      >
        <Segment.Item id="password">密码登录</Segment.Item>
        <Segment.Item id="sms">验证码登录</Segment.Item>
      </Segment>
      <Form className="space-y-5" onSubmit={submit}>
        <FormError
          error={mutation.error ?? smsMutation.error ?? resetMutation.error}
        />
        {method === "password" ? (
          <>
            <TextField
              fullWidth
              isRequired
              name="identifier"
              variant="secondary"
            >
              <Label>邮箱或手机号</Label>
              <Input
                autoComplete="username"
                id="login-identifier"
                placeholder="邮箱或手机号"
              />
              <FieldError />
            </TextField>
            <TextField
              fullWidth
              isRequired
              minLength={8}
              name="password"
              type="password"
              variant="secondary"
            >
              <Label>密码</Label>
              <Input
                autoComplete="current-password"
                id="login-password"
              />
              <Description>至少 8 位</Description>
              <FieldError />
            </TextField>
            <SliderVerification
              disabled={mutation.isPending}
              id="login-password-slider"
              onValueChange={setSliderValue}
              value={sliderValue}
            />
          </>
        ) : (
          <>
            <TextField
              fullWidth
              inputMode="numeric"
              isRequired
              maxLength={11}
              name="phoneNumber"
              onChange={setPhoneNumber}
              pattern="1[0-9]{10}"
              type="tel"
              value={phoneNumber}
              variant="secondary"
            >
              <Label>手机号</Label>
              <Input
                autoComplete="tel"
                id="login-phone"
                placeholder="11 位手机号"
              />
              <FieldError />
            </TextField>
            <SliderVerification
              disabled={smsMutation.isPending || resendSeconds > 0}
              id="login-sms-slider"
              onValueChange={setSliderValue}
              value={sliderValue}
            />
            <Button
              fullWidth
              isDisabled={
                smsMutation.isPending ||
                resendSeconds > 0 ||
                sliderValue !== 100 ||
                !/^1\d{10}$/.test(phoneNumber)
              }
              onPress={() => void sendCode()}
              type="button"
              variant="outline"
            >
              {smsMutation.isPending
                ? "正在发送"
                : resendSeconds > 0
                  ? `${resendSeconds} 秒后重新获取`
                  : "获取验证码"}
            </Button>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-code">短信验证码</Label>
              <InputOTP
                autoComplete="one-time-code"
                id="login-code"
                inputMode="numeric"
                maxLength={6}
                minLength={6}
                name="code"
                pattern="^\d+$"
                required
                variant="secondary"
              >
                <InputOTP.Group>
                  {Array.from({length: 6}, (_, index) => (
                    <InputOTP.Slot index={index} key={index} />
                  ))}
                </InputOTP.Group>
              </InputOTP>
            </div>
          </>
        )}
        <Button
          fullWidth
          isDisabled={
            mutation.isPending || (method === "password" && sliderValue !== 100)
          }
          size="lg"
          type="submit"
          variant="primary"
        >
          {mutation.isPending && !pendingDemo
            ? "正在登录"
            : method === "sms"
              ? "验证码登录"
              : "登录"}
        </Button>
      </Form>

      <div className="my-8 flex items-center gap-3" aria-hidden="true">
        <Separator className="flex-1" />
        <Typography color="muted" type="body-xs">
          快速进入
        </Typography>
        <Separator className="flex-1" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {demoAccounts.data?.map((account) => {
          const role = account.roles[0];
          return (
            <Button
              isDisabled={mutation.isPending}
              key={account.id}
              onPress={() => void enterDemo(account.email, role)}
              size="sm"
              variant="outline"
            >
              {pendingDemo === account.email
                ? "正在进入"
                : roleLabels[role] ?? account.displayName}
            </Button>
          );
        })}
      </div>
      {demoAccounts.isError ? (
        <p className="mt-3 text-sm text-muted">快捷账户暂时无法加载，可使用账号登录。</p>
      ) : null}
      <div className="mt-4 text-center">
        <AlertDialog isOpen={resetOpen} onOpenChange={setResetOpen}>
          <Button size="sm" variant="ghost">
            恢复体验数据
          </Button>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog>
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>恢复体验数据？</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  已创建的体验账户和身份申请会被清除，快捷账户将恢复到初始状态。
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    isDisabled={resetMutation.isPending}
                    onPress={() => setResetOpen(false)}
                    variant="tertiary"
                  >
                    取消
                  </Button>
                  <Button
                    isPending={resetMutation.isPending}
                    onPress={() => {
                      void resetMutation
                        .mutateAsync()
                        .then(() => {
                          setResetOpen(false);
                          toast.success("体验数据已恢复");
                        })
                        .catch(() => undefined);
                    }}
                    variant="danger"
                  >
                    恢复数据
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        还没有账户？{" "}
        <Link className="font-medium text-foreground underline underline-offset-4" href="/auth/register">
          注册
        </Link>
      </p>
    </>
  );
}

function destinationRole(
  account: SessionAccount,
  nextPath: string | null,
  preferredRole?: Role,
): Exclude<Role, "guest"> {
  const route = nextPath ? matchRoute(nextPath) : null;
  if (
    preferredRole &&
    preferredRole !== "guest" &&
    account.roles.includes(preferredRole) &&
    (!route || route.roles.includes(preferredRole))
  ) {
    return preferredRole;
  }
  const routeRole = route?.roles.find(
    (role): role is Exclude<Role, "guest"> =>
      role !== "guest" && account.roles.includes(role),
  );
  return routeRole ?? account.roles[0];
}
