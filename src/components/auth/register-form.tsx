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
import {useRouter} from "next/navigation";
import {useState} from "react";

import {useRegister} from "@/lib/auth/queries";
import {FormError, FormHeading, SliderVerification} from "./form-parts";

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
        eyebrow="新建账户"
        title="创建账户"
      />
      <Form className="space-y-5" onSubmit={submit}>
        <FormError error={validationError ?? mutation.error} />
        <TextField
          fullWidth
          isRequired
          maxLength={40}
          minLength={2}
          name="displayName"
          variant="secondary"
        >
          <Label>账户名称</Label>
          <Input
            autoComplete="organization"
            id="register-name"
            placeholder="企业或个人名称"
          />
          <FieldError />
        </TextField>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            fullWidth
            inputMode="numeric"
            isRequired
            maxLength={11}
            name="phoneNumber"
            pattern="1[0-9]{10}"
            type="tel"
            variant="secondary"
          >
            <Label>手机号</Label>
            <Input
              autoComplete="tel"
              id="register-phone"
              placeholder="11 位手机号"
            />
            <FieldError />
          </TextField>
          <TextField
            fullWidth
            isRequired
            name="email"
            type="email"
            variant="secondary"
          >
            <Label>邮箱</Label>
            <Input
              autoComplete="email"
              id="register-email"
              placeholder="name@company.com"
            />
            <FieldError />
          </TextField>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            fullWidth
            isRequired
            minLength={8}
            name="password"
            type="password"
            variant="secondary"
          >
            <Label>设置密码</Label>
            <Input
              autoComplete="new-password"
              id="register-password"
            />
            <FieldError />
          </TextField>
          <TextField
            fullWidth
            isRequired
            minLength={8}
            name="confirmPassword"
            type="password"
            variant="secondary"
          >
            <Label>确认密码</Label>
            <Input
              autoComplete="new-password"
              id="register-confirm"
            />
            <FieldError />
          </TextField>
        </div>
        <SliderVerification
          disabled={mutation.isPending}
          id="register-slider"
          onValueChange={setSliderValue}
          value={sliderValue}
        />
        <Typography className="leading-5" color="muted" type="body-xs">
          创建账户即表示你同意平台服务条款与隐私规则。
        </Typography>
        <Button
          fullWidth
          isDisabled={mutation.isPending || sliderValue !== 100}
          size="lg"
          type="submit"
          variant="primary"
        >
          {mutation.isPending ? "正在创建" : "创建账户"}
        </Button>
      </Form>
      <p className="mt-8 text-center text-sm text-muted">
        已有账户？{" "}
        <Link className="font-medium text-foreground underline underline-offset-4" href="/auth/login">
          登录
        </Link>
      </p>
    </>
  );
}
