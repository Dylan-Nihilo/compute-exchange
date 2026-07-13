"use client";

import {Alert, Button, toast} from "@heroui/react";
import Link from "next/link";
import {useState} from "react";

import {
  useApplyForIdentity,
  useCurrentAccount,
  useIdentityApplications,
} from "@/lib/auth/queries";
import {
  type IdentityApplicationInput,
  type IdentityRole,
} from "@/lib/auth/service";
import {resolveActiveRole} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";
import {fieldClassName, FormError, FormHeading} from "./form-parts";

const identityOptions: Array<{
  role: IdentityRole;
  title: string;
  description: string;
}> = [
  {role: "supplier", title: "机房供给方", description: "发布算力并管理履约与结算"},
  {role: "vendor", title: "设备厂商", description: "发布设备服务并承接居间需求"},
  {role: "funder", title: "资方", description: "接收并跟进融资租赁线索"},
];

export function IdentityForm() {
  const {data: account} = useCurrentAccount();
  const applications = useIdentityApplications();
  const mutation = useApplyForIdentity();
  const activeRole = useAuthStore((state) => state.activeRole);
  const [selectedRole, setSelectedRole] = useState<IdentityRole>("supplier");
  const [licenseFileName, setLicenseFileName] = useState("");

  if (!account) return null;

  const currentRole = resolveActiveRole(account.roles, activeRole);
  const selectedOption = identityOptions.find(({role}) => role === selectedRole)!;
  const selectedPending = applications.data?.some(
    ({requestedRole}) => requestedRole === selectedRole,
  );
  const selectedUnlocked = account.roles.includes(selectedRole);

  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const license = form.get("businessLicense");
    const common = {
      companyName: String(form.get("companyName")),
      creditCode: String(form.get("creditCode")),
      representative: String(form.get("representative")),
      representativeIdNumber: String(form.get("representativeIdNumber")),
      businessLicenseFileName:
        license instanceof File ? license.name : String(license ?? ""),
      contactMethod: String(form.get("contactMethod")),
      bankName: String(form.get("bankName")),
      accountName: String(form.get("accountName")),
      accountNumber: String(form.get("accountNumber")),
    };
    let input: IdentityApplicationInput;
    if (selectedRole === "supplier") {
      if (form.get("hasIdcLicense") !== "on") return;
      input = {
        ...common,
        requestedRole: "supplier",
        facilityAddress: String(form.get("facilityAddress")),
        hasIdcLicense: true,
        powerDescription: String(form.get("powerDescription")),
        coolingDescription: String(form.get("coolingDescription")),
      };
    } else {
      input = {...common, requestedRole: selectedRole};
    }

    await mutation
      .mutateAsync(input)
      .then(() => toast.success(`${selectedOption.title}身份申请已提交`))
      .catch(() => undefined);
  }

  return (
    <>
      <FormHeading
        description="通过对应资质审核后，新身份会出现在工作台切换器中。"
        eyebrow="Identity"
        title="身份管理"
      />
      {account.verificationStatus !== "verified" ? (
        <Alert status="warning" className="mb-6">
          <Alert.Content>
            <Alert.Title>需要先完成账户认证</Alert.Title>
            <Alert.Description>认证完成后才能提交业务身份申请。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <FormError error={mutation.error ?? applications.error} />
      <div
        aria-label="选择申请身份"
        className="mt-5 divide-y divide-border border-y border-border"
        role="group"
      >
        {identityOptions.map((option) => {
          const unlocked = account.roles.includes(option.role);
          const pending = applications.data?.some(
            ({requestedRole}) => requestedRole === option.role,
          );
          return (
            <div className="flex items-center gap-4 py-5" key={option.role}>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-foreground">{option.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{option.description}</p>
              </div>
              {unlocked ? (
                <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium">
                  已开通
                </span>
              ) : pending ? (
                <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium">
                  审核中
                </span>
              ) : (
                <Button
                  aria-label={`填写${option.title}申请资料`}
                  aria-pressed={selectedRole === option.role}
                  isDisabled={
                    account.verificationStatus !== "verified" || mutation.isPending
                  }
                  onPress={() => setSelectedRole(option.role)}
                  size="sm"
                  variant={selectedRole === option.role ? "primary" : "outline"}
                >
                  填写资料
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {account.verificationStatus === "verified" &&
      !selectedPending &&
      !selectedUnlocked ? (
        <form className="mt-8 space-y-5" onSubmit={apply}>
          <h2 className="text-lg font-semibold text-foreground">
            {selectedOption.title}资质
          </h2>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="identity-company-name">
              企业名称
            </label>
            <input
              className={fieldClassName}
              id="identity-company-name"
              name="companyName"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="identity-credit-code">
              统一社会信用代码
            </label>
            <input
              className={fieldClassName}
              id="identity-credit-code"
              maxLength={18}
              minLength={18}
              name="creditCode"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="identity-representative">
              法定代表人
            </label>
            <input
              className={fieldClassName}
              id="identity-representative"
              name="representative"
              required
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="identity-representative-id-number"
            >
              法定代表人证件号
            </label>
            <input
              autoComplete="off"
              className={fieldClassName}
              id="identity-representative-id-number"
              maxLength={18}
              minLength={15}
              name="representativeIdNumber"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="identity-contact">
              业务联系人手机或邮箱
            </label>
            <input
              className={fieldClassName}
              id="identity-contact"
              name="contactMethod"
              required
            />
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium" id="identity-license-label">
              营业执照
            </span>
            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border-secondary bg-surface px-3.5 text-sm transition-colors hover:border-border focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/15">
              <input
                accept=".jpg,.jpeg,.png,.pdf"
                aria-labelledby="identity-license-label"
                className="sr-only"
                id="identity-license"
                name="businessLicense"
                onChange={(event) =>
                  setLicenseFileName(event.currentTarget.files?.[0]?.name ?? "")
                }
                required
                type="file"
              />
              <span className="font-medium text-foreground">选择文件</span>
              <span className="truncate text-muted">
                {licenseFileName || "未选择文件"}
              </span>
            </label>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="identity-bank-name">
              开户行
            </label>
            <input
              className={fieldClassName}
              id="identity-bank-name"
              name="bankName"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="identity-account-name">
              账户名称
            </label>
            <input
              className={fieldClassName}
              id="identity-account-name"
              name="accountName"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="identity-account-number">
              银行账号
            </label>
            <input
              autoComplete="off"
              className={fieldClassName}
              id="identity-account-number"
              inputMode="numeric"
              name="accountNumber"
              pattern="[0-9]{8,32}"
              required
            />
          </div>

          {selectedRole === "supplier" ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="facility-address">
                  机房地址
                </label>
                <input
                  className={fieldClassName}
                  id="facility-address"
                  name="facilityAddress"
                  required
                />
              </div>
              <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border-secondary px-3.5 text-sm">
                <input name="hasIdcLicense" required type="checkbox" />
                已具备 IDC 经营资质
              </label>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="power-description">
                  供配电说明
                </label>
                <textarea
                  className={fieldClassName}
                  id="power-description"
                  name="powerDescription"
                  required
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="cooling-description">
                  制冷说明
                </label>
                <textarea
                  className={fieldClassName}
                  id="cooling-description"
                  name="coolingDescription"
                  required
                  rows={3}
                />
              </div>
            </>
          ) : null}

          <Button
            fullWidth
            isDisabled={mutation.isPending}
            size="lg"
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? "正在提交" : "提交资质审核"}
          </Button>
        </form>
      ) : null}

      <div className="mt-7 flex gap-3">
        {account.verificationStatus !== "verified" ? (
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            href="/auth/verify"
          >
            完成认证
          </Link>
        ) : null}
        <Link
          className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            account.verificationStatus === "verified"
              ? "bg-accent text-accent-foreground"
              : "border border-border text-foreground"
          }`}
          href={homeForRole(currentRole)}
        >
          返回工作台
        </Link>
      </div>
    </>
  );
}
