"use client";

import {
  Alert,
  Button,
  Checkbox,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  Spinner,
  TextField,
  Typography,
} from "@heroui/react";
import {Segment} from "@heroui-pro/react/segment";
import {Building2, UserRound} from "lucide";
import {AnimatePresence, motion, useReducedMotion} from "motion/react";
import {useRouter, useSearchParams} from "next/navigation";
import {useState} from "react";

import {useCurrentAccount, useVerifyAccount} from "@/lib/auth/queries";
import {resolveActiveRole, safeNextPath} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";
import {notify} from "@/lib/notify";
import {InteractiveIcon} from "@/components/system/interactive-icon";
import {FormError, FormHeading, LicenseDropZone} from "./form-parts";

const fieldClassName = "gap-2";
const labelClassName = "text-sm font-medium text-foreground";
const inputClassName =
  "rounded-[10px] border border-border bg-surface px-3 text-base text-foreground shadow-none transition-colors hover:border-border-secondary";
const motionEase = [0.22, 1, 0.36, 1] as const;

export function VerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {data: account} = useCurrentAccount();
  const mutation = useVerifyAccount();
  const activeRole = useAuthStore((state) => state.activeRole);
  const shouldReduceMotion = useReducedMotion();
  const [kind, setKind] = useState<"personal" | "enterprise">("personal");
  const [licenseFileName, setLicenseFileName] = useState("");

  if (!account) return null;
  const nextPath = safeNextPath(searchParams.get("next"));
  const target =
    nextPath ?? homeForRole(resolveActiveRole(account.roles, activeRole));

  if (account.verificationStatus === "verified") {
    return (
      <>
        <FormHeading
          description="认证信息已生效，可继续申请业务身份或进入工作台。"
          eyebrow="账户认证"
          title="认证已完成"
        />
        <Alert status="success">
          <Alert.Content>
            <Alert.Title>账户已通过认证</Alert.Title>
            <Alert.Description>{account.displayName}</Alert.Description>
          </Alert.Content>
        </Alert>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button onPress={() => router.push(target)} variant="primary">
            继续
          </Button>
          <Button onPress={() => router.push("/auth/identity")} variant="outline">
            申请业务身份
          </Button>
        </div>
      </>
    );
  }

  if (account.verificationStatus === "pending") {
    return (
      <>
        <FormHeading
          description="审核结果会同步到账户状态。"
          eyebrow="账户认证"
          title="企业认证审核中"
        />
        <Alert status="warning">
          <Alert.Content>
            <Alert.Title>资料已提交</Alert.Title>
            <Alert.Description>企业认证通过后可申请业务身份。</Alert.Description>
          </Alert.Content>
        </Alert>
        <Button
          className="mt-6"
          fullWidth
          onPress={() => router.push(target)}
          variant="primary"
        >
          返回工作台
        </Button>
      </>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const faceVerified = form.get("faceVerified") === "on";
    if (kind === "personal" && !faceVerified) return;
    if (kind === "enterprise" && !licenseFileName) return;
    const input =
      kind === "personal"
        ? {
            kind,
            legalName: String(form.get("legalName")),
            identityNumber: String(form.get("identityNumber")),
            faceVerified: true as const,
          }
        : {
            kind,
            companyName: String(form.get("companyName")),
            creditCode: String(form.get("creditCode")),
            representative: String(form.get("representative")),
            representativeIdNumber: String(form.get("representativeIdNumber")),
            businessLicenseFileName: licenseFileName,
            bankName: String(form.get("bankName")),
            accountName: String(form.get("accountName")),
            accountNumber: String(form.get("accountNumber")),
          };
    await mutation
      .mutateAsync(input)
      .then(() => {
        notify.success(
          kind === "personal"
            ? "个人认证已完成"
            : "企业认证已完成",
        );
        router.replace(target);
      })
      .catch(() => undefined);
  }

  return (
    <>
      <FormHeading
        compact
        description="完成主体信息确认后，即可继续交易、上架与结算。"
        title="完成账户认证"
      />
      <div className="mb-5">
        <div className="mb-2 flex items-center gap-2 text-muted">
          <InteractiveIcon
            icon={kind === "personal" ? UserRound : Building2}
            size={15}
          />
          <Typography
            className="text-xs font-semibold tracking-[0.08em]"
            type="body-xs"
          >
            认证主体
          </Typography>
        </div>
        <Segment
          aria-label="认证类型"
          className="w-full rounded-[12px] border border-border bg-surface-secondary p-1 [&_[data-slot=segment-indicator]]:rounded-[8px] [&_[data-slot=segment-indicator]]:bg-surface [&_[data-slot=segment-indicator]]:shadow-sm [&_[data-slot=segment-item]]:h-10 [&_[data-slot=segment-item]]:flex-1 [&_[data-slot=segment-item]]:rounded-[8px] [&_[data-slot=segment-item]]:text-sm"
          onSelectionChange={(key) => {
            setKind(key as "personal" | "enterprise");
            setLicenseFileName("");
          }}
          selectedKey={kind}
          size="lg"
        >
          <Segment.Item id="personal">个人</Segment.Item>
          <Segment.Item id="enterprise">企业</Segment.Item>
        </Segment>
      </div>
      <Form className="space-y-5" onSubmit={submit}>
        <FormError error={mutation.error} />
        <AnimatePresence initial={false} mode="wait">
          {kind === "personal" ? (
            <motion.section
              animate={{opacity: 1, x: 0}}
              className="space-y-3"
              exit={{opacity: 0, x: shouldReduceMotion ? 0 : 14}}
              initial={{opacity: 0, x: shouldReduceMotion ? 0 : -14}}
              key="personal"
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.32,
                ease: motionEase,
              }}
            >
              <header className="flex items-end justify-between gap-4 border-b border-border pb-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                    个人身份信息
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    请填写与证件一致的信息。
                  </p>
                </div>
                <span className="hidden text-xs text-muted sm:block">2 项必填</span>
              </header>
              <TextField
                className={fieldClassName}
                fullWidth
                isRequired
                name="legalName"
                variant="secondary"
              >
                <Label className={labelClassName}>姓名</Label>
                <Input
                  autoComplete="name"
                  className={inputClassName}
                  id="legal-name"
                  placeholder="请输入本人姓名"
                />
                <FieldError />
              </TextField>
              <TextField
                className={fieldClassName}
                fullWidth
                isRequired
                maxLength={18}
                minLength={15}
                name="identityNumber"
                variant="secondary"
              >
                <Label className={labelClassName}>身份证号</Label>
                <Input
                  autoComplete="off"
                  className={inputClassName}
                  id="identity-number"
                  placeholder="15 或 18 位身份证号"
                />
                <FieldError />
              </TextField>
              <Checkbox
                className="rounded-[10px] border border-border bg-surface-secondary px-4 py-3 text-sm text-foreground"
                isRequired
                name="faceVerified"
                variant="secondary"
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span>我确认以上身份信息真实有效</span>
                </Checkbox.Content>
                <FieldError />
              </Checkbox>
            </motion.section>
          ) : (
            <motion.div
              animate={{opacity: 1, x: 0}}
              className="space-y-7"
              exit={{opacity: 0, x: shouldReduceMotion ? 0 : -14}}
              initial={{opacity: 0, x: shouldReduceMotion ? 0 : 14}}
              key="enterprise"
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.32,
                ease: motionEase,
              }}
            >
            <section className="space-y-4">
              <header className="border-b border-border pb-3">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                  企业主体信息
                </h2>
                <p className="mt-1 text-sm leading-5 text-muted">
                  请填写营业执照登记信息。
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  className={`${fieldClassName} sm:col-span-2`}
                  fullWidth
                  isRequired
                  name="companyName"
                  variant="secondary"
                >
                  <Label className={labelClassName}>企业名称</Label>
                  <Input
                    className={inputClassName}
                    id="company-name"
                    placeholder="请输入营业执照上的企业全称"
                  />
                  <FieldError />
                </TextField>
                <TextField
                  className={`${fieldClassName} sm:col-span-2`}
                  fullWidth
                  isRequired
                  maxLength={18}
                  minLength={18}
                  name="creditCode"
                  variant="secondary"
                >
                  <Label className={labelClassName}>统一社会信用代码</Label>
                  <Input
                    autoComplete="off"
                    className={inputClassName}
                    id="credit-code"
                    placeholder="18 位统一社会信用代码"
                  />
                  <FieldError />
                </TextField>
                <TextField
                  className={fieldClassName}
                  fullWidth
                  isRequired
                  name="representative"
                  variant="secondary"
                >
                  <Label className={labelClassName}>法定代表人</Label>
                  <Input
                    className={inputClassName}
                    id="representative"
                    placeholder="请输入姓名"
                  />
                  <FieldError />
                </TextField>
                <TextField
                  autoComplete="off"
                  className={fieldClassName}
                  fullWidth
                  isRequired
                  maxLength={18}
                  minLength={15}
                  name="representativeIdNumber"
                  variant="secondary"
                >
                  <Label className={labelClassName}>代表人证件号</Label>
                  <Input
                    autoComplete="off"
                    className={inputClassName}
                    id="representative-id-number"
                    placeholder="15 或 18 位证件号"
                  />
                  <FieldError />
                </TextField>
              </div>
              <LicenseDropZone
                fileName={licenseFileName}
                id="business-license"
                onSelect={(files) => setLicenseFileName(files[0]?.name ?? "")}
              />
            </section>

            <section className="space-y-4">
              <header className="border-b border-border pb-3">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                  结算账户
                </h2>
                <p className="mt-1 text-sm leading-5 text-muted">
                  账户名称应与认证企业一致。
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  className={`${fieldClassName} sm:col-span-2`}
                  fullWidth
                  isRequired
                  name="bankName"
                  variant="secondary"
                >
                  <Label className={labelClassName}>开户行</Label>
                  <Input
                    className={inputClassName}
                    id="bank-name"
                    placeholder="请输入开户行全称"
                  />
                  <FieldError />
                </TextField>
                <TextField
                  className={fieldClassName}
                  fullWidth
                  isRequired
                  name="accountName"
                  variant="secondary"
                >
                  <Label className={labelClassName}>账户名称</Label>
                  <Input className={inputClassName} id="account-name" />
                  <FieldError />
                </TextField>
                <TextField
                  autoComplete="off"
                  className={fieldClassName}
                  fullWidth
                  inputMode="numeric"
                  isRequired
                  name="accountNumber"
                  pattern="[0-9]{8,32}"
                  variant="secondary"
                >
                  <Label className={labelClassName}>银行账号</Label>
                  <Input
                    autoComplete="off"
                    className={inputClassName}
                    id="account-number"
                  />
                  <FieldError />
                </TextField>
              </div>
            </section>
            </motion.div>
          )}
        </AnimatePresence>
        <footer className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Link className="text-center text-sm text-muted underline-offset-4 hover:underline" href={target}>
            稍后处理，返回工作台
          </Link>
          <Button
            className="h-11 w-full rounded-[10px] px-6 text-sm sm:w-auto sm:min-w-[190px]"
            isDisabled={
              mutation.isPending || (kind === "enterprise" && !licenseFileName)
            }
            isPending={mutation.isPending}
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? (
              <>
                <Spinner aria-hidden="true" color="current" size="sm" />
                正在核验
              </>
            ) : (
              "确认并完成认证"
            )}
          </Button>
        </footer>
      </Form>
    </>
  );
}
