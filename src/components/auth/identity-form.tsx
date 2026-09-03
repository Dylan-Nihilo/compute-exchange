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
  TextArea,
  TextField,
  Typography,
} from "@heroui/react";
import {ArrowLeft, ArrowRight, Clock3, Landmark, ServerCog, ShieldCheck} from "lucide";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {ResultState} from "@/components/system/operation-state";
import {
  useApplyForIdentity,
  useCurrentAccount,
  useIdentityApplications,
} from "@/lib/auth/queries";
import {type IdentityApplicationInput} from "@/lib/auth/contracts";
import {resolveActiveRole} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";
import {notify} from "@/lib/notify";
import {FormError, LicenseDropZone} from "./form-parts";

const fieldClassName = "gap-2";
const labelClassName = "text-[13px] font-semibold text-foreground";
const inputClassName =
  "min-h-12 rounded-[12px] border border-border bg-surface-secondary/55 px-3.5 text-[15px] text-foreground shadow-none outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-secondary focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 data-[invalid]:border-danger data-[invalid]:bg-danger/5";
const textAreaClassName = `${inputClassName} min-h-[104px] py-3`;
const checkboxClassName =
  "rounded-[12px] border border-border bg-surface-secondary/55 px-4 py-3.5 text-sm text-foreground transition-colors hover:border-border-secondary";
const motionEase = [0.22, 1, 0.36, 1] as const;
const identityNumberPattern = /^(?:\d{15}|\d{17}[\dXx])$/;
const accountNumberPattern = /^\d{8,32}$/;
const phonePattern = /^1\d{10}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredField(label: string) {
  return (value: string) => (value.trim() ? null : `请填写${label}`);
}

function validateIdentityNumber(value: string) {
  if (!value.trim()) return "请填写证件号";
  return identityNumberPattern.test(value.trim())
    ? null
    : "证件号需为 15 位数字，或 18 位且末位可为 X";
}

function validateContactMethod(value: string) {
  const contact = value.trim();
  if (!contact) return "请填写业务联系人";
  return phonePattern.test(contact) || emailPattern.test(contact)
    ? null
    : "请输入 11 位手机号或有效邮箱";
}

export function IdentityForm() {
  const router = useRouter();
  const {data: account} = useCurrentAccount();
  const applications = useIdentityApplications();
  const mutation = useApplyForIdentity(account?.id ?? null);
  const activeRole = useAuthStore((state) => state.activeRole);
  const beginRoleSwitch = useAuthStore((state) => state.beginRoleSwitch);
  const shouldReduceMotion = useReducedMotion();
  const [companyName, setCompanyName] = useState("");
  const [sameAccountName, setSameAccountName] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licenseFileName, setLicenseFileName] = useState("");
  const [licenseError, setLicenseError] = useState("");
  const [hasIdcLicense, setHasIdcLicense] = useState(false);
  const [idcLicenseError, setIdcLicenseError] = useState("");
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

  if (!account) return null;

  const currentRole = resolveActiveRole(account.roles, activeRole);
  const supplierPending = applications.data?.some(
    ({requestedRole, status}) => requestedRole === "supplier" && status === "pending",
  );
  const supplierApproved = applications.data?.some(
    ({requestedRole, status}) => requestedRole === "supplier" && status === "approved",
  );
  const supplierUnlocked = account.roles.includes("supplier");
  const returnPath = homeForRole(currentRole);

  if (account.verificationStatus !== "verified") {
    return (
      <ResultState
        action={
          <Button
            className="min-h-11 rounded-[12px] px-6"
            onPress={() => router.push("/auth/verify?next=%2Fsupplier%2Fapply")}
            variant="primary"
          >
            <InteractiveIcon icon={ShieldCheck} size={17} />
            完成账户认证
          </Button>
        }
        description="完成个人或企业认证后，即可提交供给方入驻资料。"
        icon={ShieldCheck}
        status="warning"
        title="先完成账户认证"
      />
    );
  }

  if (supplierPending) {
    return (
      <ResultState
        action={
          <Button
            className="min-h-11 rounded-[12px] px-6"
            onPress={() => router.push(returnPath)}
            variant="outline"
          >
            <InteractiveIcon icon={ArrowLeft} size={17} />
            返回工作台
          </Button>
        }
        description="资料已提交，审核结果会同步到账户消息。"
        icon={Clock3}
        status="warning"
        title="供给方申请审核中"
      />
    );
  }

  if (supplierUnlocked) {
    return (
      <ResultState
        action={
          <Button
            className="min-h-11 rounded-[12px] px-6"
            onPress={() =>
              beginRoleSwitch("supplier", account.roles, "/console/supplier")
            }
            variant="primary"
          >
            进入供给方工作台
            <InteractiveIcon icon={ArrowRight} size={17} />
          </Button>
        }
        description="供给方权限已经生效，现在可以发布资源并管理履约。"
        title="供给方身份已开通"
      />
    );
  }

  if (supplierApproved) {
    return (
      <ResultState
        action={
          <Button
            className="min-h-11 rounded-[12px] px-6"
            onPress={() => router.push(returnPath)}
            variant="outline"
          >
            <InteractiveIcon icon={ArrowLeft} size={17} />
            返回工作台
          </Button>
        }
        description="审核已经通过，供给方权限正在同步到账户。"
        title="供给方申请已通过"
      />
    );
  }

  function resetSubmitError() {
    if (mutation.error) mutation.reset();
  }

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!licenseFile) {
      setLicenseError("请选择营业执照文件后再提交");
      document.getElementById("identity-license")?.focus();
      return;
    }
    if (!hasIdcLicense) {
      setIdcLicenseError("请确认已具备 IDC 经营资质");
      document.getElementById("has-idc-license")?.focus();
      return;
    }

    const common = {
      companyName: String(form.get("companyName")),
      creditCode: String(form.get("creditCode")),
      representative: String(form.get("representative")),
      representativeIdNumber: String(form.get("representativeIdNumber")),
      businessLicenseFileName: licenseFileName,
      businessLicenseFile: licenseFile,
      contactMethod: String(form.get("contactMethod")),
      bankName: String(form.get("bankName")),
      accountName: String(form.get("accountName")),
      accountNumber: String(form.get("accountNumber")),
    };
    const input: IdentityApplicationInput = {
      ...common,
      requestedRole: "supplier",
      facilityAddress: String(form.get("facilityAddress")),
      hasIdcLicense: true,
      powerDescription: String(form.get("powerDescription")),
      coolingDescription: String(form.get("coolingDescription")),
    };

    await mutation
      .mutateAsync(input)
      .then(() => notify.success("供给方申请已提交"))
      .catch(() => undefined);
  }

  return (
    <>
      <header className="mb-5 pb-4 pt-1">
        <motion.div
          className="w-fit origin-left"
          style={{scale: titleScale, y: titleOffset}}
        >
          <Typography
            className="text-[28px] leading-10 tracking-[-0.035em] text-[#0b263a]"
            type="h1"
          >
            成为供给方
          </Typography>
        </motion.div>
      </header>

      <FormError
        error={mutation.error ?? applications.error}
        title="身份申请未提交"
      />

      {!supplierPending && !supplierApproved && !supplierUnlocked ? (
        <Form className="space-y-0" onSubmit={apply}>
          <section className="border-t border-border pt-6">
            <header className="mb-5 flex items-center gap-2.5">
              <InteractiveIcon icon={ServerCog} size={18} />
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                供给方资料
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
                  autoComplete="organization"
                  className={inputClassName}
                  id="identity-company-name"
                  placeholder="营业执照上的企业全称"
                />
                <FieldError />
              </TextField>
              <TextField
                className={fieldClassName}
                fullWidth
                isRequired
                maxLength={18}
                name="creditCode"
                onChange={resetSubmitError}
                validate={(value) =>
                  value.trim().length === 18
                    ? null
                    : "统一社会信用代码需为 18 位"
                }
                variant="secondary"
              >
                <Label className={labelClassName}>统一社会信用代码</Label>
                <Input
                  autoComplete="off"
                  className={inputClassName}
                  id="identity-credit-code"
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
                  autoComplete="name"
                  className={inputClassName}
                  id="identity-representative"
                  placeholder="请输入姓名"
                />
                <FieldError />
              </TextField>
              <TextField
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
                  id="identity-representative-id-number"
                  placeholder="15 或 18 位证件号"
                />
                <FieldError />
              </TextField>
              <TextField
                className={`${fieldClassName} sm:col-span-2`}
                fullWidth
                isRequired
                name="contactMethod"
                onChange={resetSubmitError}
                validate={validateContactMethod}
                variant="secondary"
              >
                <Label className={labelClassName}>业务联系人</Label>
                <Input
                  autoComplete="email"
                  className={inputClassName}
                  id="identity-contact"
                  placeholder="手机号或邮箱"
                />
                <FieldError />
              </TextField>
              <div className="sm:col-span-2">
                <LicenseDropZone
                  error={licenseError}
                  fileName={licenseFileName}
                  id="identity-license"
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

          <section className="mt-8 border-t border-border pt-6">
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
                  autoComplete="off"
                  className={inputClassName}
                  id="identity-bank-name"
                  placeholder="请输入开户行全称"
                />
                <FieldError />
              </TextField>
              <TextField
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
                  id="identity-account-number"
                  placeholder="请输入对公银行账号"
                />
                <FieldError />
              </TextField>
              <Checkbox
                className={`${checkboxClassName} sm:col-span-2`}
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
                <input
                  name="accountName"
                  type="hidden"
                  value={companyName.trim()}
                />
              ) : (
                <motion.div
                  animate={{opacity: 1, y: 0}}
                  className="sm:col-span-2"
                  initial={{opacity: 0, y: shouldReduceMotion ? 0 : -8}}
                  transition={{
                    duration: shouldReduceMotion ? 0.1 : 0.24,
                    ease: motionEase,
                  }}
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
                      id="identity-account-name"
                      placeholder="请输入对公账户名称"
                    />
                    <FieldError />
                  </TextField>
                </motion.div>
              )}
            </div>
          </section>

          <motion.section
            animate={{opacity: 1, y: 0}}
            className="mt-8 border-t border-border pt-6"
            initial={{opacity: 0, y: shouldReduceMotion ? 0 : 8}}
            transition={{
              duration: shouldReduceMotion ? 0.1 : 0.28,
              ease: motionEase,
            }}
          >
            <header className="mb-5 flex items-center gap-2.5">
              <InteractiveIcon icon={ServerCog} size={18} />
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                机房能力
              </h2>
            </header>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <TextField
                className={`${fieldClassName} sm:col-span-2`}
                fullWidth
                isRequired
                name="facilityAddress"
                onChange={resetSubmitError}
                validate={requiredField("机房地址")}
                variant="secondary"
              >
                <Label className={labelClassName}>机房地址</Label>
                <Input
                  autoComplete="street-address"
                  className={inputClassName}
                  id="facility-address"
                  placeholder="请输入机房详细地址"
                />
                <FieldError />
              </TextField>
              <div className="sm:col-span-2">
                <Checkbox
                  aria-describedby={
                    idcLicenseError ? "has-idc-license-error" : undefined
                  }
                  aria-invalid={Boolean(idcLicenseError)}
                  className={`${checkboxClassName} w-full ${
                    idcLicenseError ? "border-danger/50 bg-danger/5" : ""
                  }`}
                  id="has-idc-license"
                  isRequired
                  isSelected={hasIdcLicense}
                  name="hasIdcLicense"
                  onChange={(selected) => {
                    setHasIdcLicense(selected);
                    setIdcLicenseError("");
                    resetSubmitError();
                  }}
                  variant="secondary"
                >
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <span>我确认已具备 IDC 经营资质</span>
                  </Checkbox.Content>
                </Checkbox>
                {idcLicenseError ? (
                  <p
                    className="mt-2 text-xs leading-5 text-danger"
                    id="has-idc-license-error"
                    role="alert"
                  >
                    {idcLicenseError}
                  </p>
                ) : null}
              </div>
              <TextField
                className={fieldClassName}
                fullWidth
                isRequired
                name="powerDescription"
                onChange={resetSubmitError}
                validate={requiredField("供配电说明")}
                variant="secondary"
              >
                <Label className={labelClassName}>供配电说明</Label>
                <TextArea
                  className={textAreaClassName}
                  id="power-description"
                  placeholder="容量、冗余与供电等级"
                  rows={3}
                />
                <FieldError />
              </TextField>
              <TextField
                className={fieldClassName}
                fullWidth
                isRequired
                name="coolingDescription"
                onChange={resetSubmitError}
                validate={requiredField("制冷说明")}
                variant="secondary"
              >
                <Label className={labelClassName}>制冷说明</Label>
                <TextArea
                  className={textAreaClassName}
                  id="cooling-description"
                  placeholder="制冷方式与保障能力"
                  rows={3}
                />
                <FieldError />
              </TextField>
            </div>
          </motion.section>

          <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-medium text-muted no-underline transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href={returnPath}
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
                  正在提交
                </>
              ) : (
                "提交供给方申请"
              )}
            </Button>
          </footer>
        </Form>
      ) : (
        <div className="flex gap-3 border-t border-border pt-5">
          {account.verificationStatus !== "verified" ? (
            <Button
              onPress={() =>
                router.push("/auth/verify?next=%2Fsupplier%2Fapply")
              }
              variant="primary"
            >
              完成账户认证
            </Button>
          ) : null}
          <Button onPress={() => router.push(returnPath)} variant="outline">
            返回工作台
          </Button>
        </div>
      )}
    </>
  );
}
