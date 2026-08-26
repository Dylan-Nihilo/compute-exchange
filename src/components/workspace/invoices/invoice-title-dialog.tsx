"use client";

import {Button, Input, Label, Modal, Spinner, TextField} from "@heroui/react";
import {useEffect, useState} from "react";

import {
  isValidTaxNo,
  type InvoiceTitle,
  type SaveInvoiceTitleInput,
} from "@/lib/buyer-invoices";

const inputClass =
  "h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba]";
const inputErrorClass =
  "h-10 rounded-xl border border-[#e5484d]/60 bg-[#fff7f7] px-3.5 text-sm text-[#24495d] shadow-[0_5px_12px_-8px_rgba(36,74,95,0.08)] placeholder:text-[#9cb0ba]";

type FieldKey = "companyName" | "taxNo" | "bankName" | "bankAccount";
type FieldValues = Record<FieldKey, string>;
type FieldErrors = Partial<Record<FieldKey, string>>;

const emptyValues: FieldValues = {companyName: "", taxNo: "", bankName: "", bankAccount: ""};

function validateField(key: FieldKey, values: FieldValues): string | null {
  const value = values[key].trim();
  switch (key) {
    case "companyName":
      if (value.length < 2) return "请填写与营业执照一致的企业全称";
      if (value.length > 128) return "企业名称过长";
      return null;
    case "taxNo":
      if (!value) return "请填写纳税人识别号";
      if (!isValidTaxNo(value)) return "格式不正确: 15/18/20 位字母或数字";
      return null;
    case "bankName":
      if (value.length < 2) return "请填写开户行";
      if (value.length > 128) return "开户行名称过长";
      return null;
    case "bankAccount":
      if (!value) return "请填写银行账号";
      if (!/^\d{8,32}$/.test(value)) return "银行账号为 8-32 位数字";
      return null;
  }
}

export function InvoiceTitleDialog({
  initial,
  isPending = false,
  onCancel,
  onSubmit,
  open,
}: {
  initial: InvoiceTitle | null;
  isPending?: boolean;
  onCancel: () => void;
  onSubmit: (input: SaveInvoiceTitleInput) => void;
  open: boolean;
}) {
  const [values, setValues] = useState<FieldValues>(emptyValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

  useEffect(() => {
    if (open) {
      setValues({
        companyName: initial?.company_name ?? "",
        taxNo: initial?.tax_no ?? "",
        bankName: initial?.bank_name ?? "",
        bankAccount: initial?.bank_account ?? "",
      });
      setErrors({});
      setTouched({});
    }
  }, [initial, open]);

  const changeValue = (key: FieldKey, value: string) => {
    // 税号统一大写; 银行账号仅允许数字。
    if (key === "taxNo") value = value.toUpperCase();
    if (key === "bankAccount") value = value.replace(/\D/g, "");
    setValues((current) => ({...current, [key]: value}));
    // 输入即清除该字段错误, 让用户看到即时反馈。
    setErrors((current) => (current[key] ? {...current, [key]: undefined} : current));
  };

  const blurField = (key: FieldKey) => {
    setTouched((current) => ({...current, [key]: true}));
    const error = validateField(key, values);
    setErrors((current) => ({...current, [key]: error ?? undefined}));
  };

  const submit = () => {
    const nextErrors: FieldErrors = {};
    for (const key of Object.keys(values) as FieldKey[]) {
      const error = validateField(key, values);
      if (error) nextErrors[key] = error;
    }
    setErrors(nextErrors);
    setTouched({companyName: true, taxNo: true, bankName: true, bankAccount: true});
    if (Object.values(nextErrors).some(Boolean)) return;
    onSubmit({
      company_name: values.companyName.trim(),
      tax_no: values.taxNo.trim(),
      bank_name: values.bankName.trim(),
      bank_account: values.bankAccount.trim(),
    });
  };

  const fieldProps = (key: FieldKey) => ({
    error: touched[key] ? errors[key] : undefined,
    onBlur: () => blurField(key),
  });

  return (
    <Modal.Root isOpen={open} onOpenChange={(isOpen) => { if (!isOpen && !isPending) onCancel(); }}>
      <Modal.Backdrop isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold text-[#173447]">
                {initial ? "编辑开票信息" : "完善开票信息"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-4">
              <Field
                label="企业名称"
                placeholder="与营业执照一致的企业全称"
                value={values.companyName}
                onChange={(value) => changeValue("companyName", value)}
                {...fieldProps("companyName")}
              />
              <Field
                autoComplete="off"
                label="纳税人识别号"
                placeholder="统一社会信用代码(18 位)"
                value={values.taxNo}
                onChange={(value) => changeValue("taxNo", value)}
                {...fieldProps("taxNo")}
              />
              <Field
                label="开户行"
                placeholder="例如: 招商银行北京分行"
                value={values.bankName}
                onChange={(value) => changeValue("bankName", value)}
                {...fieldProps("bankName")}
              />
              <Field
                autoComplete="off"
                inputMode="numeric"
                label="银行账号"
                placeholder="企业对公账户(8-32 位数字)"
                value={values.bankAccount}
                onChange={(value) => changeValue("bankAccount", value)}
                {...fieldProps("bankAccount")}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button isDisabled={isPending} onPress={onCancel} variant="tertiary">
                取消
              </Button>
              <Button isPending={isPending} onPress={submit} variant="primary">
                {isPending ? (
                  <>
                    <Spinner aria-hidden="true" color="current" size="sm" />
                    正在保存
                  </>
                ) : (
                  "保存"
                )}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function Field({
  autoComplete,
  error,
  inputMode,
  label,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  autoComplete?: string;
  error?: string;
  inputMode?: "numeric";
  label: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <TextField fullWidth className="gap-1.5" value={value} variant="secondary" onChange={onChange}>
      <Label className="text-[13px] font-medium text-[#24495d]">{label}</Label>
      <Input
        autoComplete={autoComplete}
        className={error ? inputErrorClass : inputClass}
        inputMode={inputMode}
        onBlur={onBlur}
        placeholder={placeholder}
      />
      {error ? (
        <p className="text-xs text-[#c4392f]" role="alert">{error}</p>
      ) : null}
    </TextField>
  );
}
