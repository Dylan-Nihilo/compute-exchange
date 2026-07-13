"use client";

import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
  toast,
  Typography,
} from "@heroui/react";
import {RadioButtonGroup} from "@heroui-pro/react/radio-button-group";
import {useRouter} from "next/navigation";
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
import {FormError, FormHeading, LicenseDropZone} from "./form-parts";

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
  const router = useRouter();
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
    if (!licenseFileName) return;
    const common = {
      companyName: String(form.get("companyName")),
      creditCode: String(form.get("creditCode")),
      representative: String(form.get("representative")),
      representativeIdNumber: String(form.get("representativeIdNumber")),
      businessLicenseFileName: licenseFileName,
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
        eyebrow="业务身份"
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
      <RadioButtonGroup
        aria-label="选择申请身份"
        className="mt-5 w-full"
        isDisabled={
          account.verificationStatus !== "verified" || mutation.isPending
        }
        name="identityRole"
        onChange={(value) => setSelectedRole(value as IdentityRole)}
        value={selectedRole}
        variant="secondary"
      >
        {identityOptions.map((option) => {
          const unlocked = account.roles.includes(option.role);
          const pending = applications.data?.some(
            ({requestedRole}) => requestedRole === option.role,
          );
          return (
            <RadioButtonGroup.Item
              aria-label={
                unlocked
                  ? `${option.title}已开通`
                  : pending
                    ? `${option.title}审核中`
                    : `申请${option.title}身份`
              }
              isDisabled={unlocked || pending}
              key={option.role}
              value={option.role}
            >
              <RadioButtonGroup.Indicator />
              <RadioButtonGroup.ItemContent>
                <div className="flex items-center justify-between gap-3">
                  <Label>{option.title}</Label>
                  {unlocked ? (
                    <Chip color="success" size="sm" variant="soft">
                      <Chip.Label>已开通</Chip.Label>
                    </Chip>
                  ) : pending ? (
                    <Chip color="warning" size="sm" variant="soft">
                      <Chip.Label>审核中</Chip.Label>
                    </Chip>
                  ) : null}
                </div>
                <Description>{option.description}</Description>
              </RadioButtonGroup.ItemContent>
            </RadioButtonGroup.Item>
          );
        })}
      </RadioButtonGroup>

      {account.verificationStatus === "verified" &&
      !selectedPending &&
      !selectedUnlocked ? (
        <Form className="mt-8 space-y-5" onSubmit={apply}>
          <Typography type="h4">
            {selectedOption.title}资质
          </Typography>
          <TextField
            fullWidth
            isRequired
            name="companyName"
            variant="secondary"
          >
            <Label>企业名称</Label>
            <Input id="identity-company-name" />
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
            <Input id="identity-credit-code" />
            <FieldError />
          </TextField>
          <TextField
            fullWidth
            isRequired
            name="representative"
            variant="secondary"
          >
            <Label>法定代表人</Label>
            <Input id="identity-representative" />
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
              id="identity-representative-id-number"
            />
            <FieldError />
          </TextField>
          <TextField
            fullWidth
            isRequired
            name="contactMethod"
            variant="secondary"
          >
            <Label>业务联系人手机或邮箱</Label>
            <Input id="identity-contact" />
            <FieldError />
          </TextField>
          <LicenseDropZone
            fileName={licenseFileName}
            id="identity-license"
            onSelect={(files) => setLicenseFileName(files[0]?.name ?? "")}
          />
          <TextField
            fullWidth
            isRequired
            name="bankName"
            variant="secondary"
          >
            <Label>开户行</Label>
            <Input id="identity-bank-name" />
            <FieldError />
          </TextField>
          <TextField
            fullWidth
            isRequired
            name="accountName"
            variant="secondary"
          >
            <Label>账户名称</Label>
            <Input id="identity-account-name" />
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
            <Input autoComplete="off" id="identity-account-number" />
            <FieldError />
          </TextField>

          {selectedRole === "supplier" ? (
            <>
              <TextField
                fullWidth
                isRequired
                name="facilityAddress"
                variant="secondary"
              >
                <Label>机房地址</Label>
                <Input id="facility-address" />
                <FieldError />
              </TextField>
              <Checkbox isRequired name="hasIdcLicense" variant="secondary">
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  已具备 IDC 经营资质
                </Checkbox.Content>
                <FieldError />
              </Checkbox>
              <TextField
                fullWidth
                isRequired
                name="powerDescription"
                variant="secondary"
              >
                <Label>供配电说明</Label>
                <TextArea id="power-description" rows={3} />
                <FieldError />
              </TextField>
              <TextField
                fullWidth
                isRequired
                name="coolingDescription"
                variant="secondary"
              >
                <Label>制冷说明</Label>
                <TextArea id="cooling-description" rows={3} />
                <FieldError />
              </TextField>
            </>
          ) : null}

          <Button
            fullWidth
            isDisabled={mutation.isPending || !licenseFileName}
            size="lg"
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? "正在提交" : "提交资质审核"}
          </Button>
        </Form>
      ) : null}

      <div className="mt-7 flex gap-3">
        {account.verificationStatus !== "verified" ? (
          <Button onPress={() => router.push("/auth/verify")} variant="primary">
            完成认证
          </Button>
        ) : null}
        <Button
          onPress={() => router.push(homeForRole(currentRole))}
          variant={
            account.verificationStatus === "verified" ? "primary" : "outline"
          }
        >
          返回工作台
        </Button>
      </div>
    </>
  );
}
