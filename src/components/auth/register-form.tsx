"use client";

import {Button, toast} from "@heroui/react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";

import {useRegister} from "@/lib/auth/queries";
import {
  fieldClassName,
  FormError,
  FormHeading,
  SliderVerification,
} from "./form-parts";

export function RegisterForm() {
  const router = useRouter();
  const mutation = useRegister();
  const [validationError, setValidationError] = useState<Error | null>(null);
  const [sliderValue, setSliderValue] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirmPassword"))) {
      setValidationError(new Error("两次输入的密码不一致"));
      return;
    }

    await mutation
      .mutateAsync({
        displayName: String(form.get("displayName")),
        email: String(form.get("email")),
        phoneNumber: String(form.get("phoneNumber")),
        password,
        sliderVerified: sliderValue === 100,
      })
      .then(() => {
        toast.success("账户已创建");
        router.replace("/auth/verify");
      })
      .catch(() => setSliderValue(0));
  }

  return (
    <>
      <FormHeading
        description="注册后获得买家身份，完成认证后可申请其他业务身份。"
        eyebrow="Create account"
        title="创建账户"
      />
      <form className="space-y-5" onSubmit={submit}>
        <FormError error={validationError ?? mutation.error} />
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="register-name">
            账户名称
          </label>
          <input
            autoComplete="organization"
            className={fieldClassName}
            id="register-name"
            maxLength={40}
            minLength={2}
            name="displayName"
            placeholder="企业或个人名称"
            required
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="register-phone"
            >
              手机号
            </label>
            <input
              autoComplete="tel"
              className={fieldClassName}
              id="register-phone"
              inputMode="numeric"
              maxLength={11}
              name="phoneNumber"
              pattern="1[0-9]{10}"
              placeholder="11 位手机号"
              required
              type="tel"
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="register-email"
            >
              邮箱
            </label>
            <input
              autoComplete="email"
              className={fieldClassName}
              id="register-email"
              name="email"
              placeholder="name@company.com"
              required
              type="email"
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="register-password">
              设置密码
            </label>
            <input
              autoComplete="new-password"
              className={fieldClassName}
              id="register-password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="register-confirm">
              确认密码
            </label>
            <input
              autoComplete="new-password"
              className={fieldClassName}
              id="register-confirm"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </div>
        </div>
        <SliderVerification
          disabled={mutation.isPending}
          id="register-slider"
          onValueChange={setSliderValue}
          value={sliderValue}
        />
        <p className="text-xs leading-5 text-muted">
          创建账户即表示你同意平台服务条款与隐私规则。
        </p>
        <Button
          fullWidth
          isDisabled={mutation.isPending || sliderValue !== 100}
          size="lg"
          type="submit"
          variant="primary"
        >
          {mutation.isPending ? "正在创建" : "创建账户"}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        已有账户？{" "}
        <Link className="font-medium text-foreground underline underline-offset-4" href="/auth/login">
          登录
        </Link>
      </p>
    </>
  );
}
