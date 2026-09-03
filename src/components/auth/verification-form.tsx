"use client";

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
  Typography,
} from "@heroui/react";
import {Segment} from "@heroui-pro/react/segment";
import {ArrowLeft, Building2, Clock3, Landmark, UserRound} from "lucide";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {useRouter, useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";

import {useCurrentAccount, useVerifyAccount} from "@/lib/auth/queries";
import {
  completedVerificationDestination,
  resolveActiveRole,
  safeNextPath,
} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";
import {notify} from "@/lib/notify";
import {InteractiveIcon} from "@/components/system/interactive-icon";
import {ResultState} from "@/components/system/operation-state";
import {FormError, LicenseDropZone} from "./form-parts";

const fieldClassName = "gap-2";
const labelClassName = "text-[13px] font-semibold text-foreground";
const inputClassName =
  "min-h-12 rounded-[12px] border border-border bg-surface-secondary/55 px-3.5 text-[15px] text-foreground shadow-none outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-secondary focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 data-[invalid]:border-danger data-[invalid]:bg-danger/5";
const motionEase = [0.22, 1, 0.36, 1] as const;
const identityNumberPattern = /^(?:\d{15}|\d{17}[\dXx])$/;
const accountNumberPattern = /^\d{8,32}$/;

function requiredField(label: string) {
  return (value: string) => (value.trim() ? null : `请填写${label}`);
}

function validateIdentityNumber(value: string) {
  if (!value.trim()) return "请填写证件号";
  return identityNumberPattern.test(value.trim())
    ? null
    : "证件号需为 15 位数字，或 18 位且末位可为 X";
}

export function VerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {data: account} = useCurrentAccount();
  const mutation = useVerifyAccount(account?.id ?? null);
  const activeRole = useAuthStore((state) => state.activeRole);
  const shouldReduceMotion = useReducedMotion();
  const [kind, setKind] = useState<"personal" | "enterprise">("personal");
  const [companyName, setCompanyName] = useState("");
  const [creditCode, setCreditCode] = useState("");
  const [sameAccountName, setSameAccountName] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [licenseFileName, setLicenseFileName] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseError, setLicenseError] = useState("");
  const scrollY = useMotionValue(0);
  const titleScale = useTransform(
    scrollY,
    [0, 112],
    shouldReduceMotion ? [1, 1] : [1, 0.92],
  );
  const titleOffset = useTransform(
    scrollY,
    [0, 112],
    shouldReduceMotion ? [0, 0] : [0, -2],
  );

  useEffect(() => {
    const panel = document.getElementById("auth-content-panel");
    if (!panel) return;
    const syncScroll = () => scrollY.set(panel.scrollTop);
    syncScroll();
    panel.addEventListener("scroll", syncScroll, {passive: true});
    return () => panel.removeEventListener("scroll", syncScroll);
  }, [scrollY]);

  const nextPath = safeNextPath(searchParams.get("next"));
  const target = account
    ? nextPath ?? homeForRole(resolveActiveRole(account.roles, activeRole))
    : "/";
  const completedDestination = account
    ? completedVerificationDestination(account, activeRole, nextPath)
    : null;

  useEffect(() => {
    if (completedDestination) router.replace(completedDestination);
  }, [completedDestination, router]);

  function resetSubmitError() {
    if (mutation.error) mutation.reset();
  }

  if (!account || completedDestination) return null;

  if (account.verificationStatus === "pending") {
    return (
      <ResultState
        action={
          <Button
            className="min-h-11 rounded-[12px] px-6"
            onPress={() => router.push(target)}
            variant="outline"
          >
            <InteractiveIcon icon={ArrowLeft} size={17} />
            返回工作台
          </Button>
        }
        description="资料已经提交，审核结果会同步到账户状态。"
        icon={Clock3}
        status="warning"
        title="企业认证审核中"
      />
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const faceVerified = form.get("faceVerified") === "on";
    if (kind === "personal" && !faceVerified) return;
    if (kind === "enterprise" && !licenseFile) {
      setLicenseError("请选择营业执照文件后再提交");
      document.getElementById("business-license")?.focus();
      return;
    }
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
            businessLicenseFile: licenseFile ?? undefined,
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
      <header className="auth-verification-header mb-5 pb-4 pt-1">
        <motion.div
          className="w-fit origin-left"
          style={{scale: titleScale, y: titleOffset}}
        >
          <Typography
            className="text-[28px] leading-10 tracking-[-0.035em] text-[#0b263a]"
            type="h1"
          >
            完成账户认证
          </Typography>
        </motion.div>
      </header>
      <div className="mb-7">
        <Segment
          aria-label="认证类型"
          className="w-full rounded-[14px] border border-border bg-surface-secondary p-1.5 [&_[data-slot=segment-indicator]]:rounded-[10px] [&_[data-slot=segment-indicator]]:border [&_[data-slot=segment-indicator]]:border-border [&_[data-slot=segment-indicator]]:bg-surface [&_[data-slot=segment-indicator]]:shadow-sm [&_[data-slot=segment-item]]:h-11 [&_[data-slot=segment-item]]:flex-1 [&_[data-slot=segment-item]]:gap-2 [&_[data-slot=segment-item]]:rounded-[10px] [&_[data-slot=segment-item]]:text-sm [&_[data-slot=segment-item]]:font-medium"
          onSelectionChange={(key) => {
            setKind(key as "personal" | "enterprise");
            setLicenseError("");
            mutation.reset();
          }}
          selectedKey={kind}
          size="lg"
        >
          <Segment.Item id="personal">
            <InteractiveIcon icon={UserRound} size={16} />
            个人认证
          </Segment.Item>
          <Segment.Item id="enterprise">
            <InteractiveIcon icon={Building2} size={16} />
            企业认证
          </Segment.Item>
        </Segment>
      </div>
      <Form
        className="space-y-0"
        onSubmit={submit}
      >
        <FormError error={mutation.error} title="认证资料未提交" />
        <AnimatePresence initial={false} mode="wait">
          {kind === "personal" ? (
            <motion.section
              animate={{opacity: 1, x: 0}}
              className="border-t border-border pt-6"
              exit={{opacity: 0, x: shouldReduceMotion ? 0 : 14}}
              initial={{opacity: 0, x: shouldReduceMotion ? 0 : -14}}
              key="personal"
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.32,
                ease: motionEase,
              }}
            >
              <header className="mb-5 flex items-center gap-2.5">
                <InteractiveIcon icon={UserRound} size={18} />
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                  身份信息
                </h2>
              </header>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  className={fieldClassName}
                  fullWidth
                  isRequired
                  name="legalName"
                  onChange={resetSubmitError}
                  validate={requiredField("本人姓名")}
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
                  name="identityNumber"
                  onChange={resetSubmitError}
                  validate={validateIdentityNumber}
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
                  className="rounded-[12px] border border-border bg-surface-secondary/55 px-4 py-3.5 text-sm text-foreground transition-colors hover:border-border-secondary sm:col-span-2"
                  isRequired
                  name="faceVerified"
                  onChange={resetSubmitError}
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
              </div>
            </motion.section>
          ) : (
            <motion.div
              animate={{opacity: 1, x: 0}}
              className="space-y-8"
              exit={{opacity: 0, x: shouldReduceMotion ? 0 : -14}}
              initial={{opacity: 0, x: shouldReduceMotion ? 0 : 14}}
              key="enterprise"
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.32,
                ease: motionEase,
              }}
            >
              <section className="border-t border-border pt-6">
                <header className="mb-5 flex items-center gap-2.5">
                  <InteractiveIcon icon={Building2} size={18} />
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                    企业主体
                  </h2>
                </header>
                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <TextField
                  className={fieldClassName}
                  fullWidth
                  isRequired
                  name="companyName"
                  onChange={(value) => {
                    setCompanyName(value);
                    resetSubmitError();
                  }}
                  validate={requiredField("企业全称")}
                  value={companyName}
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
                  className={fieldClassName}
                  fullWidth
                  isRequired
                  maxLength={18}
                  name="creditCode"
                  onChange={(value) => {
                    setCreditCode(value.toUpperCase());
                    resetSubmitError();
                  }}
                  validate={(value) =>
                    value.trim().length === 18
                      ? null
                      : "统一社会信用代码需为 18 位"
                  }
                  value={creditCode}
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
                  onChange={resetSubmitError}
                  validate={requiredField("法定代表人姓名")}
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
                  name="representativeIdNumber"
                  onChange={resetSubmitError}
                  validate={validateIdentityNumber}
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
                  <div className="sm:col-span-2">
                    <LicenseDropZone
                      error={licenseError}
                      fileName={licenseFileName}
                      id="business-license"
                      onSelect={(files) => {
                        const file = files[0] ?? null;
                        setLicenseFile(file);
                        setLicenseFileName(file?.name ?? "");
                        setLicenseError("");
                        resetSubmitError();
                      }}
                    />
                  </div>
                </div>
              </section>

              <section className="border-t border-border pt-6">
                <header className="mb-5 flex items-center gap-2.5">
                  <InteractiveIcon icon={Landmark} size={18} />
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                    结算账户
                  </h2>
                </header>
                <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                  <TextField
                    className={fieldClassName}
                    fullWidth
                    isRequired
                    name="bankName"
                    onChange={resetSubmitError}
                    validate={requiredField("开户行全称")}
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
                    autoComplete="off"
                    className={fieldClassName}
                    fullWidth
                    inputMode="numeric"
                    isRequired
                    name="accountNumber"
                    onChange={resetSubmitError}
                    validate={(value) =>
                      accountNumberPattern.test(value.trim())
                        ? null
                        : "银行账号需为 8–32 位数字"
                    }
                    variant="secondary"
                  >
                    <Label className={labelClassName}>银行账号</Label>
                    <Input
                      autoComplete="off"
                      className={inputClassName}
                      id="account-number"
                      placeholder="请输入对公银行账号"
                    />
                    <FieldError />
                  </TextField>
                  <Checkbox
                    className="rounded-[12px] border border-border bg-surface-secondary/55 px-4 py-3.5 text-sm text-foreground transition-colors hover:border-border-secondary sm:col-span-2"
                    isSelected={sameAccountName}
                    onChange={(selected) => {
                      setSameAccountName(selected);
                      if (!selected && !accountName) setAccountName(companyName);
                      resetSubmitError();
                    }}
                    variant="secondary"
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span>账户名称同企业名称</span>
                    </Checkbox.Content>
                  </Checkbox>
                  {sameAccountName ? (
                    <input name="accountName" type="hidden" value={companyName.trim()} />
                  ) : (
                    <motion.div
                      animate={{opacity: 1, y: 0}}
                      className="sm:col-span-2"
                      initial={{opacity: 0, y: shouldReduceMotion ? 0 : -8}}
                      transition={{duration: shouldReduceMotion ? 0.1 : 0.24, ease: motionEase}}
                    >
                      <TextField
                        className={fieldClassName}
                        fullWidth
                        isRequired
                        name="accountName"
                        onChange={(value) => {
                          setAccountName(value);
                          resetSubmitError();
                        }}
                        validate={requiredField("账户名称")}
                        value={accountName}
                        variant="secondary"
                      >
                        <Label className={labelClassName}>账户名称</Label>
                        <Input
                          className={inputClassName}
                          id="account-name"
                          placeholder="请输入对公账户名称"
                        />
                        <FieldError />
                      </TextField>
                    </motion.div>
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
        <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-medium text-muted no-underline transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href={target}
          >
            <InteractiveIcon
              className="transition-transform duration-200 motion-safe:group-hover:-translate-x-0.5"
              icon={ArrowLeft}
              size={16}
            />
            返回工作台
          </Link>
          <Button
            className="h-11 w-full rounded-[10px] px-6 text-sm sm:w-auto sm:min-w-[190px]"
            isDisabled={mutation.isPending}
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
