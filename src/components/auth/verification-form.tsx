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
  TextField,
  toast,
} from "@heroui/react";
import {Segment} from "@heroui-pro/react/segment";
import {useRouter, useSearchParams} from "next/navigation";
import {useState} from "react";

import {useCurrentAccount, useVerifyAccount} from "@/lib/auth/queries";
import {resolveActiveRole, safeNextPath} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";
import {FormError, FormHeading, LicenseDropZone} from "./form-parts";

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
            phoneNumber: String(form.get("phoneNumber")),
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
        eyebrow="账户认证"
        title="账户认证"
      />
      <Segment
        aria-label="认证类型"
        className="mb-6 w-full"
        onSelectionChange={(key) => {
          setKind(key as "personal" | "enterprise");
          setLicenseFileName("");
        }}
        selectedKey={kind}
      >
        <Segment.Item id="personal">个人认证</Segment.Item>
        <Segment.Item id="enterprise">企业认证</Segment.Item>
      </Segment>
      <Form className="space-y-5" onSubmit={submit}>
        <FormError error={mutation.error} />
        {kind === "personal" ? (
          <>
            <TextField
              fullWidth
              isRequired
              name="legalName"
              variant="secondary"
            >
              <Label>姓名</Label>
              <Input id="legal-name" />
              <FieldError />
            </TextField>
            <TextField
              fullWidth
              isRequired
              maxLength={18}
              minLength={15}
              name="identityNumber"
              variant="secondary"
            >
              <Label>身份证号</Label>
              <Input
                id="identity-number"
              />
              <FieldError />
            </TextField>
            <TextField
              fullWidth
              inputMode="numeric"
              isRequired
              maxLength={11}
              minLength={11}
              name="phoneNumber"
              type="tel"
              variant="secondary"
            >
              <Label>手机号</Label>
              <Input
                autoComplete="tel"
                id="phone-number"
              />
              <FieldError />
            </TextField>
            <Checkbox isRequired name="faceVerified" variant="secondary">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                我已完成人脸核验
              </Checkbox.Content>
              <FieldError />
            </Checkbox>
          </>
        ) : (
          <>
            <TextField
              fullWidth
              isRequired
              name="companyName"
              variant="secondary"
            >
              <Label>企业名称</Label>
              <Input id="company-name" />
              <FieldError />
            </TextField>
            <TextField
              fullWidth
              isRequired
              maxLength={18}
              minLength={18}
              name="creditCode"
              variant="secondary"
            >
              <Label>统一社会信用代码</Label>
              <Input
                id="credit-code"
              />
              <FieldError />
            </TextField>
            <TextField
              fullWidth
              isRequired
              name="representative"
              variant="secondary"
            >
              <Label>法定代表人</Label>
              <Input id="representative" />
              <FieldError />
            </TextField>
            <TextField
              autoComplete="off"
              fullWidth
              isRequired
              maxLength={18}
              minLength={15}
              name="representativeIdNumber"
              variant="secondary"
            >
              <Label>法定代表人证件号</Label>
              <Input
                autoComplete="off"
                id="representative-id-number"
              />
              <FieldError />
            </TextField>
            <LicenseDropZone
              fileName={licenseFileName}
              id="business-license"
              onSelect={(files) => setLicenseFileName(files[0]?.name ?? "")}
            />
            <TextField
              fullWidth
              isRequired
              name="bankName"
              variant="secondary"
            >
              <Label>开户行</Label>
              <Input id="bank-name" />
              <FieldError />
            </TextField>
            <TextField
              fullWidth
              isRequired
              name="accountName"
              variant="secondary"
            >
              <Label>账户名称</Label>
              <Input id="account-name" />
              <FieldError />
            </TextField>
            <TextField
              autoComplete="off"
              fullWidth
              inputMode="numeric"
              isRequired
              name="accountNumber"
              pattern="[0-9]{8,32}"
              variant="secondary"
            >
              <Label>银行账号</Label>
              <Input
                autoComplete="off"
                id="account-number"
              />
              <FieldError />
            </TextField>
          </>
        )}
        <Button
          fullWidth
          isDisabled={
            mutation.isPending || (kind === "enterprise" && !licenseFileName)
          }
          size="lg"
          type="submit"
          variant="primary"
        >
          {mutation.isPending ? "正在核验" : "提交认证"}
        </Button>
      </Form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link className="underline underline-offset-4" href={target}>
          稍后认证
        </Link>
      </p>
    </>
  );
}
