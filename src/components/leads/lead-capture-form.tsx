"use client";

import {useMutation} from "@tanstack/react-query";
import {Button} from "@heroui/react";

import {submitLead, type LeadInput, type LeadType} from "@/lib/leads";

// 与实名/登录表单同源的输入样式(rounded-[12px] + surface 面色 + 柔光 focus 环), 保持全站一致。
const inputClass =
  "mt-2 min-h-12 w-full rounded-[12px] border border-border bg-surface-secondary/55 px-3.5 text-[15px] text-foreground shadow-none outline-none transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-secondary focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10";

export interface LeadCaptureFormProps {
  leadType: LeadType;
  /** 线索来源标识, 进 CRM 供转化追踪(如 leasing_page) */
  source: string;
  title: string;
  subtitle: string;
  amountLabel: string;
  amountOptions: readonly string[];
  termLabel?: string;
  termOptions?: readonly string[];
  intentLabel?: string;
  intentOptions?: readonly string[];
  descriptionPlaceholder: string;
  companyRequired?: boolean;
  /** 合规声明, 展示在表单下方(融资租赁为设计红线, 必传) */
  disclaimer?: string;
}

// 三个板块(设备整包/组网机电/融资租赁)共用的留资表单: 字段集与 CRM leads 契约一致,
// 意向方案不落独立列, 以「【意向方案】…」前缀并入需求描述。
export function LeadCaptureForm(props: LeadCaptureFormProps) {
  const mutation = useMutation({mutationFn: (input: LeadInput) => submitLead(input)});

  if (mutation.isSuccess) {
    return (
      <div className="rounded-[1.25rem] border border-border bg-white p-6 shadow-[0_16px_36px_rgba(6,37,59,0.08)]" role="status">
        <h3 className="text-lg font-semibold text-foreground">需求已提交</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          登记编号 #{mutation.data.id}。平台顾问将在 1 个工作日内通过你填写的电话与你联系, 确认需求细节。
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-5 rounded-[1.25rem] border border-border bg-white p-6 shadow-[0_16px_36px_rgba(6,37,59,0.08)]"
      onSubmit={(event) => {
        event.preventDefault();
        if (mutation.isPending) return;
        const data = new FormData(event.currentTarget);
        const field = (name: string) => String(data.get(name) ?? "").trim();
        const intent = field("intent");
        const detail = field("description");
        const description = [intent ? `【意向方案】${intent}` : "", detail]
          .filter(Boolean)
          .join("\n");
        mutation.mutate({
          type: props.leadType,
          contact_name: field("contact_name"),
          contact_phone: field("contact_phone"),
          contact_email: field("contact_email") || undefined,
          company_name: field("company_name") || undefined,
          description: description || undefined,
          amount_range: field("amount_range") || undefined,
          term: field("term") || undefined,
          source: props.source,
        });
      }}
    >
      <div>
        <h3 className="text-lg font-semibold text-foreground">{props.title}</h3>
        <p className="mt-1 text-sm text-muted">{props.subtitle}</p>
      </div>

      <label className="block text-sm font-medium text-foreground">
        企业名称{props.companyRequired ? "" : "（选填）"}
        <input className={inputClass} maxLength={128} name="company_name" placeholder="营业执照上的公司全称" required={props.companyRequired} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-foreground">
          联系人
          <input autoComplete="name" className={inputClass} maxLength={64} name="contact_name" required />
        </label>
        <label className="block text-sm font-medium text-foreground">
          联系电话
          <input autoComplete="tel" className={inputClass} maxLength={20} name="contact_phone" required type="tel" />
        </label>
      </div>

      <label className="block text-sm font-medium text-foreground">
        邮箱（选填）
        <input autoComplete="email" className={inputClass} maxLength={128} name="contact_email" type="email" />
      </label>

      {props.intentOptions?.length ? (
        <label className="block text-sm font-medium text-foreground">
          {props.intentLabel ?? "意向方案"}
          <select className={inputClass} defaultValue="" name="intent">
            <option value="">请选择</option>
            {props.intentOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-foreground">
          {props.amountLabel}
          <select className={inputClass} defaultValue="" name="amount_range">
            <option value="">请选择</option>
            {props.amountOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        {props.termOptions?.length ? (
          <label className="block text-sm font-medium text-foreground">
            {props.termLabel ?? "期望期限"}
            <select className={inputClass} defaultValue="" name="term">
              <option value="">请选择</option>
              {props.termOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <label className="block text-sm font-medium text-foreground">
        需求说明（选填）
        <textarea
          className={`${inputClass} min-h-28 resize-y py-3`}
          maxLength={2000}
          name="description"
          placeholder={props.descriptionPlaceholder}
        />
      </label>

      {mutation.isError ? (
        <p className="text-sm text-danger" role="alert">{mutation.error.message}</p>
      ) : null}

      <Button fullWidth isPending={mutation.isPending} type="submit">
        提交需求
      </Button>

      {props.disclaimer ? (
        <p className="text-xs leading-5 text-muted">{props.disclaimer}</p>
      ) : null}
    </form>
  );
}
