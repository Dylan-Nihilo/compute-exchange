"use client";

import {Alert, Button, toast} from "@heroui/react";
import Link from "next/link";
import {useRouter, useSearchParams} from "next/navigation";
import {useState} from "react";

import {useCurrentAccount, useVerifyAccount} from "@/lib/auth/queries";
import {resolveActiveRole, safeNextPath} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";
import {fieldClassName, FormError, FormHeading} from "./form-parts";

export function VerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {data: account} = useCurrentAccount();
  const mutation = useVerifyAccount();
  const activeRole = useAuthStore((state) => state.activeRole);
  const [kind, setKind] = useState<"personal" | "enterprise">("enterprise");
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
          eyebrow="Verification"
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
          eyebrow="Verification"
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
    const license = form.get("businessLicense");
    const input =
      kind === "personal"
        ? {
            kind,
            legalName: String(form.get("legalName")),
            identityNumber: String(form.get("identityNumber")),
            phoneNumber: String(form.get("phoneNumber")),
            faceVerified: true as const,
          }
        : {
            kind,
            companyName: String(form.get("companyName")),
            creditCode: String(form.get("creditCode")),
            representative: String(form.get("representative")),
            representativeIdNumber: String(form.get("representativeIdNumber")),
            businessLicenseFileName:
              license instanceof File ? license.name : String(license ?? ""),
            bankName: String(form.get("bankName")),
            accountName: String(form.get("accountName")),
            accountNumber: String(form.get("accountNumber")),
          };
    await mutation
      .mutateAsync(input)
      .then((updated) => {
        toast.success(
          updated.verificationStatus === "verified"
            ? "个人认证已完成"
            : "企业认证已提交审核",
        );
        router.replace(target);
      })
      .catch(() => undefined);
  }

  return (
    <>
      <FormHeading
        description="认证用于交易、上架与结算等关键业务。"
        eyebrow="Verification"
        title="账户认证"
      />
      <div className="mb-6 grid grid-cols-2 gap-2" role="group" aria-label="认证类型">
        <Button
          aria-label="选择个人认证"
          aria-pressed={kind === "personal"}
          onPress={() => {
            setKind("personal");
            setLicenseFileName("");
          }}
          variant={kind === "personal" ? "primary" : "outline"}
        >
          个人认证
        </Button>
        <Button
          aria-label="选择企业认证"
          aria-pressed={kind === "enterprise"}
          onPress={() => {
            setKind("enterprise");
            setLicenseFileName("");
          }}
          variant={kind === "enterprise" ? "primary" : "outline"}
        >
          企业认证
        </Button>
      </div>
      <form className="space-y-5" onSubmit={submit}>
        <FormError error={mutation.error} />
        {kind === "personal" ? (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="legal-name">
                姓名
              </label>
              <input className={fieldClassName} id="legal-name" name="legalName" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="identity-number">
                身份证号
              </label>
              <input
                className={fieldClassName}
                id="identity-number"
                maxLength={18}
                minLength={15}
                name="identityNumber"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="phone-number">
                手机号
              </label>
              <input
                autoComplete="tel"
                className={fieldClassName}
                id="phone-number"
                inputMode="numeric"
                maxLength={11}
                minLength={11}
                name="phoneNumber"
                required
                type="tel"
              />
            </div>
            <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border-secondary px-3.5 text-sm">
              <input name="faceVerified" required type="checkbox" />
              我已完成人脸核验
            </label>
          </>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="company-name">
                企业名称
              </label>
              <input className={fieldClassName} id="company-name" name="companyName" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="credit-code">
                统一社会信用代码
              </label>
              <input
                className={fieldClassName}
                id="credit-code"
                maxLength={18}
                minLength={18}
                name="creditCode"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="representative">
                法定代表人
              </label>
              <input className={fieldClassName} id="representative" name="representative" required />
            </div>
            <div>
              <label
                className="mb-2 block text-sm font-medium"
                htmlFor="representative-id-number"
              >
                法定代表人证件号
              </label>
              <input
                autoComplete="off"
                className={fieldClassName}
                id="representative-id-number"
                maxLength={18}
                minLength={15}
                name="representativeIdNumber"
                required
              />
            </div>
            <div>
              <span className="mb-2 block text-sm font-medium" id="business-license-label">
                营业执照
              </span>
              <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border-secondary bg-surface px-3.5 text-sm transition-colors hover:border-border focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/15">
                <input
                  accept=".jpg,.jpeg,.png,.pdf"
                  aria-labelledby="business-license-label"
                  className="sr-only"
                  id="business-license"
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
              <label className="mb-2 block text-sm font-medium" htmlFor="bank-name">
                开户行
              </label>
              <input className={fieldClassName} id="bank-name" name="bankName" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="account-name">
                账户名称
              </label>
              <input className={fieldClassName} id="account-name" name="accountName" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="account-number">
                银行账号
              </label>
              <input
                autoComplete="off"
                className={fieldClassName}
                id="account-number"
                inputMode="numeric"
                name="accountNumber"
                pattern="[0-9]{8,32}"
                required
              />
            </div>
          </>
        )}
        <Button
          fullWidth
          isDisabled={mutation.isPending}
          size="lg"
          type="submit"
          variant="primary"
        >
          {mutation.isPending ? "正在核验" : "提交认证"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link className="underline underline-offset-4" href={target}>
          稍后认证
        </Link>
      </p>
    </>
  );
}
