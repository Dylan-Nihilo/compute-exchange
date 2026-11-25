"use client";

import {Button, Input, Label, Modal, Spinner, TextField} from "@heroui/react";
import {useQuery} from "@tanstack/react-query";
import {useEffect, useRef, useState} from "react";

import {notify} from "@/lib/notify";
import {
  uploadSupplierPaymentAccountFile,
  validatePaymentAccountApplication,
  type PaymentAccountApplication,
  type SupplierPaymentAccount,
} from "@/lib/supplier-workspace";

const inputClass =
  "h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";
const inputErrorClass =
  "h-10 rounded-xl border border-[#e5484d]/60 bg-[#fff7f7] px-3.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";
const labelClass = "text-[13px] font-medium text-[#24495d]";
const selectClass = "h-10 w-full border border-[#afc4ce]/45 bg-white/80 text-sm text-[#24495d] disabled:opacity-60";

type FormState = Required<PaymentAccountApplication>;
type Errors = Partial<Record<keyof PaymentAccountApplication, string>>;
/** [code, name, children] — 省 → 市 → 区县; 区县无 children。 */
type Region = [string, string, Region[]?];

const emptyForm: FormState = {
  sign_name: "", short_name: "", licence_no: "", licence_url: "", open_account_licence_url: "",
  legal_name: "", legal_licence_no: "", legal_front_url: "", legal_back_url: "",
  contact_name: "", contact_mobile: "", contact_email: "",
  province: "", city: "", district: "", address: "",
  bank_card_no: "", cnaps_code: "", share_certificate_url: "",
};

// 收款账户开通弹窗: 供给方填写企业资料并上传证照, 平台代向易宝提交为分账接收方。
export function PaymentAccountModal({
  account,
  isPending = false,
  onCancel,
  onSubmit,
  open,
}: {
  account: SupplierPaymentAccount | undefined;
  isPending?: boolean;
  onCancel: () => void;
  onSubmit: (input: PaymentAccountApplication) => void;
  open: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [uploading, setUploading] = useState(0);
  // 行政区划数据约 85KB, 打开弹窗时才加载。
  const regions = useQuery({
    enabled: open,
    queryKey: ["cn-regions"],
    queryFn: async () => (await import("@/data/cn-regions.json")).default as unknown as Region[],
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      sign_name: account?.prefill?.sign_name ?? "",
      licence_no: account?.prefill?.licence_no ?? "",
      legal_name: account?.prefill?.legal_name ?? "",
    });
    setErrors({});
    setUploading(0);
  }, [open, account?.prefill?.sign_name, account?.prefill?.licence_no, account?.prefill?.legal_name]);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((current) => ({...current, [key]: value}));
    setErrors((current) => (current[key] ? {...current, [key]: undefined} : current));
  };
  const busy = isPending || uploading > 0;
  const cities = regions.data?.find(([code]) => code === form.province)?.[2] ?? [];
  const districts = cities.find(([code]) => code === form.city)?.[2] ?? [];

  const submit = () => {
    const input: PaymentAccountApplication = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value !== ""),
    ) as PaymentAccountApplication;
    const nextErrors = validatePaymentAccountApplication({...emptyForm, ...input});
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      notify.error("请检查标红的资料");
      return;
    }
    onSubmit(input);
  };

  const field = (key: keyof FormState, label: string, placeholder: string, extra?: {inputMode?: "numeric" | "email" | "tel"; maxLength?: number}) => (
    <TextField fullWidth className="gap-1.5" value={form[key]} variant="secondary" onChange={set(key)}>
      <Label className={labelClass}>{label}</Label>
      <Input autoComplete="off" className={errors[key] ? inputErrorClass : inputClass} placeholder={placeholder} {...extra} />
      {errors[key] ? <p className="text-xs text-[#c4392f]" role="alert">{errors[key]}</p> : null}
    </TextField>
  );
  const upload = (key: keyof FormState, label: string, hint: string) => (
    <FileField
      error={errors[key]}
      hint={hint}
      label={label}
      onBusy={(delta) => setUploading((count) => Math.max(0, count + delta))}
      onUploaded={set(key)}
      uploaded={form[key] !== ""}
    />
  );

  return (
    <Modal.Root isOpen={open} onOpenChange={(isOpen) => { if (!isOpen && !busy) onCancel(); }}>
      <Modal.Backdrop isDismissable={!busy}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-2xl">
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold text-[#173447]">开通易宝收款账户</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="max-h-[70vh] gap-5 overflow-y-auto">
              <p className="rounded-xl border border-[#dce9ee] bg-white/55 px-4 py-2.5 text-xs leading-5 text-[#78909c]">
                订单款项由易宝支付托管。提交企业资料后, 平台代你向易宝申请开通分账接收账户; 审核通过后, 你的应得款项将自动分账并于次日结算到下方对公账户。
                {account?.status === "rejected" && account.audit_opinion ? <span className="mt-1 block text-[#c4392f]">上次申请被驳回：{account.audit_opinion}</span> : null}
              </p>

              <Section title="企业信息">
                {field("sign_name", "企业全称 *", "与营业执照一致")}
                {field("short_name", "企业简称 *", "2-20 个字")}
                {field("licence_no", "统一社会信用代码 *", "18 位", {maxLength: 18})}
                {upload("licence_url", "营业执照 *", "副本照片或扫描件")}
              </Section>

              <Section title="法定代表人">
                {field("legal_name", "姓名 *", "法定代表人姓名")}
                {field("legal_licence_no", "身份证号 *", "18 位", {maxLength: 18})}
                {upload("legal_front_url", "身份证人像面 *", "清晰完整, 四角可见")}
                {upload("legal_back_url", "身份证国徽面 *", "清晰完整, 四角可见")}
              </Section>

              <Section title="联系人">
                {field("contact_name", "姓名 *", "业务联系人")}
                {field("contact_mobile", "手机号 *", "接收易宝通知与商户后台账号", {inputMode: "tel", maxLength: 11})}
                <div className="sm:col-span-2">{field("contact_email", "邮箱 *", "接收协议与通知", {inputMode: "email"})}</div>
              </Section>

              <Section title="经营地址">
                <div className="sm:col-span-2">
                  <p className={labelClass}>所在省市区 *</p>
                  <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                    <select aria-label="省份" className={selectClass} disabled={!regions.data} value={form.province}
                      onChange={(event) => setForm((current) => ({...current, province: event.target.value, city: "", district: ""}))}>
                      <option value="">{regions.isPending ? "加载中…" : regions.isError ? "加载失败" : "选择省份"}</option>
                      {regions.data?.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                    <select aria-label="城市" className={selectClass} disabled={!cities.length} value={form.city}
                      onChange={(event) => setForm((current) => ({...current, city: event.target.value, district: ""}))}>
                      <option value="">选择城市</option>
                      {cities.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                    <select aria-label="区县" className={selectClass} disabled={!districts.length} value={form.district} onChange={(event) => set("district")(event.target.value)}>
                      <option value="">选择区县</option>
                      {districts.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                    </select>
                  </div>
                  {errors.district ? <p className="mt-1.5 text-xs text-[#c4392f]" role="alert">{errors.district}</p> : null}
                </div>
                <div className="sm:col-span-2">{field("address", "详细地址 *", "街道、门牌号, 不含省市区")}</div>
              </Section>

              <Section title="对公结算账户">
                {field("bank_card_no", "对公账号 *", "企业对公账户账号", {inputMode: "numeric"})}
                {field("cnaps_code", "开户行联行号 *", "12 位, 见开户许可证或咨询开户行", {inputMode: "numeric", maxLength: 12})}
                {upload("open_account_licence_url", "开户许可证", "或基本存款账户信息, 建议上传以提高通过率")}
                {upload("share_certificate_url", "供应商合作协议", "与平台签署的合作协议, 如有请上传")}
              </Section>

              <p className="text-xs leading-5 text-[#9cb0ba]">
                证照文件仅支持 JPG、PNG、PDF, 单个不超过 6MB; 文件直接转存至易宝用于审核, 平台不保存。
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button isDisabled={busy} onPress={onCancel} variant="tertiary">取消</Button>
              <Button isDisabled={uploading > 0} isPending={isPending} onPress={submit} variant="primary">
                {isPending ? (<><Spinner aria-hidden="true" color="current" size="sm" />正在提交</>) : uploading > 0 ? "文件上传中…" : "提交开通申请"}
              </Button>
            </Modal.Footer>
            <Modal.CloseTrigger />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}

function Section({children, title}: {children: React.ReactNode; title: string}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-[#173447]">{title}</legend>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function FileField({
  error,
  hint,
  label,
  onBusy,
  onUploaded,
  uploaded,
}: {
  error?: string;
  hint: string;
  label: string;
  onBusy: (delta: 1 | -1) => void;
  onUploaded: (url: string) => void;
  uploaded: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [pending, setPending] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setPending(true);
    onBusy(1);
    try {
      onUploaded(await uploadSupplierPaymentAccountFile(file));
      setFileName(file.name);
    } catch (uploadError) {
      onUploaded("");
      setFileName("");
      notify.error(uploadError instanceof Error ? uploadError.message : "文件上传失败");
    } finally {
      setPending(false);
      onBusy(-1);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="min-w-0">
      <p className={labelClass}>{label}</p>
      <div className={`mt-1.5 flex h-10 items-center gap-2 rounded-xl border bg-white/80 pr-1.5 pl-3.5 ${error ? "border-[#e5484d]/60 bg-[#fff7f7]" : "border-[#afc4ce]/45"}`}>
        <span className={`min-w-0 flex-1 truncate text-sm ${uploaded ? "text-[#24495d]" : "text-[#9cb0ba]"}`}>
          {pending ? "上传中…" : uploaded ? `已上传${fileName ? ` · ${fileName}` : ""}` : hint}
        </span>
        <Button className="h-7 shrink-0 rounded-lg px-3 text-xs" isDisabled={pending} onPress={() => inputRef.current?.click()} size="sm" variant="outline">
          {uploaded ? "重新上传" : "选择文件"}
        </Button>
        <input accept="image/jpeg,image/png,application/pdf" aria-label={label} className="sr-only" onChange={(event) => void choose(event.target.files?.[0])} ref={inputRef} tabIndex={-1} type="file" />
      </div>
      {error ? <p className="mt-1.5 text-xs text-[#c4392f]" role="alert">{error}</p> : null}
    </div>
  );
}
