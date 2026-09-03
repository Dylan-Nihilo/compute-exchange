"use client";

import {Button} from "@heroui/react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {BellRing, KeyRound, Save, ShieldCheck} from "lucide";
import {useEffect, useState} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {createAdminNotice, fetchAdminConfig, fetchAdminNotices, updateAdminConfig} from "@/lib/admin-workspace";
import {capabilities} from "@/lib/domain/permissions";
import {notify} from "@/lib/notify";

import {AdminPage, AdminPanel} from "./admin-ui";

const inputClass = "h-11 w-full rounded-xl border border-[#bfd0d8]/70 bg-white/65 px-3 text-sm text-[#173447] outline-none transition focus:border-[#4e7b91] focus:ring-4 focus:ring-[#4e7b91]/10";

export function AdminCms() {
	const client = useQueryClient();
  const [content, setContent] = useState("");
	const notices = useQuery({queryKey: ["admin", "notices"], queryFn: () => fetchAdminNotices()});
  const mutation = useMutation({
    mutationFn: (content: string) => createAdminNotice(content),
    onSuccess: async () => { setContent(""); await client.invalidateQueries({queryKey: ["admin", "notices"]}); notify.success("公告已发布"); },
    onError: (error) => notify.error(messageFor(error)),
  });
  return (
    <AdminPage title="内容管理" eyebrow="Content" description="发布面向平台用户的运营公告。">
      <AdminPanel className="max-w-3xl p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e6f4f8] text-[#355f73]"><InteractiveIcon icon={BellRing} size={18} /></span><h2 className="text-base font-semibold text-[#173447]">发布公告</h2></div>
        <label className="mt-5 block text-xs font-semibold text-[#5e7786]" htmlFor="admin-notice">公告内容</label>
        <textarea id="admin-notice" className={`${inputClass} mt-2 min-h-36 resize-y py-3`} maxLength={1000} placeholder="填写需要通知平台用户的内容" value={content} onChange={(event) => setContent(event.target.value)} />
        <div className="mt-4 flex items-center justify-between"><span className="text-xs text-[#8aa0ab]">{content.length}/1000</span><Button isDisabled={!content.trim()} isPending={mutation.isPending} variant="primary" onPress={() => mutation.mutate(content.trim())}>发布公告</Button></div>
		{notices.data?.length ? <div className="mt-6 border-t border-[#dce9ee]/70 pt-4"><h3 className="text-sm font-semibold text-[#173447]">已发布</h3><div className="mt-3 space-y-2">{notices.data.map((notice) => <div className="rounded-xl border border-[#dce9ee]/70 bg-white/55 px-4 py-3 text-sm leading-6 text-[#355465]" key={notice.id}>{notice.content}</div>)}</div></div> : null}
      </AdminPanel>
    </AdminPage>
  );
}

export function AdminAccess() {
  const groups = [
    {role: "系统管理员", scope: "全部权限", tone: "bg-[#173447] text-white"},
    {role: "平台运营", scope: "由授权范围决定", tone: "bg-[#e5f3f8] text-[#355f73]"},
    {role: "业务用户", scope: "按买家、供给方等身份隔离", tone: "bg-[#edf2f4] text-[#647c88]"},
  ];
  return (
    <AdminPage title="角色与权限" eyebrow="Access" description="当前权限由账户角色与能力授权共同决定。">
      <AdminPanel className="overflow-hidden">
        <div className="grid border-b border-[#dce9ee]/70 sm:grid-cols-3">{groups.map((item) => <div className="border-b border-[#dce9ee]/70 p-5 last:border-0 sm:border-r sm:border-b-0 sm:last:border-r-0" key={item.role}><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${item.tone}`}>{item.role}</span><p className="mt-3 text-sm text-[#5e7786]">{item.scope}</p></div>)}</div>
        <div className="p-5 sm:p-6"><h2 className="flex items-center gap-2 text-sm font-semibold text-[#173447]"><InteractiveIcon icon={KeyRound} size={17} />平台能力</h2><div className="mt-4 flex flex-wrap gap-2">{capabilities.filter((item) => !["browse", "authenticate", "kyc"].includes(item)).map((item) => <span className="rounded-lg border border-[#c8d9e0]/55 bg-white/60 px-2.5 py-1.5 font-mono text-[11px] text-[#4f6b79]" key={item}>{item}</span>)}</div></div>
      </AdminPanel>
    </AdminPage>
  );
}

export function AdminSettings() {
  const client = useQueryClient();
  const query = useQuery({queryKey: ["admin", "config"], queryFn: () => fetchAdminConfig()});
  const [feeRate, setFeeRate] = useState("500");
  useEffect(() => { if (query.data) setFeeRate(String(query.data.fee_rate)); }, [query.data]);
  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(feeRate);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10000) throw new Error("费率需为 0–10000 的整数基点");
      await updateAdminConfig("fee_rate", feeRate);
    },
    onSuccess: async () => { await client.invalidateQueries({queryKey: ["admin", "config"]}); notify.success("系统配置已保存"); },
    onError: (error) => notify.error(messageFor(error)),
  });
  const tradingMutation = useMutation({
    mutationFn: (enabled: boolean) => updateAdminConfig("trading_enabled", String(enabled)),
    onSuccess: async () => { await client.invalidateQueries({queryKey: ["admin", "config"]}); notify.success("交易开关已更新"); },
    onError: (error) => notify.error(messageFor(error)),
  });
  return (
    <AdminPage title="系统设置" eyebrow="System" description="调整影响平台交易的全局参数。">
      <AdminPanel className="max-w-3xl divide-y divide-[#dce9ee]/70">
        <div className="flex items-center justify-between gap-4 p-5 sm:p-6"><div><h2 className="text-sm font-semibold text-[#173447]">允许创建交易</h2><p className="mt-1 text-xs text-[#78909c]">关闭后应阻止新的交易进入。</p></div><button aria-checked={query.data?.trading_enabled ?? false} className={`relative h-7 w-12 rounded-full transition-colors ${query.data?.trading_enabled ? "bg-[#78ad27]" : "bg-[#bdcbd1]"}`} disabled={query.isPending || tradingMutation.isPending} role="switch" type="button" onClick={() => tradingMutation.mutate(!(query.data?.trading_enabled ?? false))}><span className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform ${query.data?.trading_enabled ? "translate-x-5" : "translate-x-0"}`} /></button></div>
        <div className="p-5 sm:p-6"><label className="text-sm font-semibold text-[#173447]" htmlFor="admin-fee-rate">平台费率（基点）</label><div className="mt-3 flex max-w-md gap-2"><input className={inputClass} id="admin-fee-rate" inputMode="numeric" min="0" max="10000" value={feeRate} onChange={(event) => setFeeRate(event.target.value)} /><Button isPending={mutation.isPending} variant="primary" onPress={() => mutation.mutate()}><InteractiveIcon icon={Save} size={15} />保存</Button></div></div>
      </AdminPanel>
    </AdminPage>
  );
}

export function AdminTokens() {
  return (
    <AdminPage title="Token 管理" eyebrow="Token" description="Token 发行与链上管理尚未接入后台服务。">
      <AdminPanel className="grid min-h-80 place-items-center p-8 text-center"><div className="max-w-md"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e6f4f8] text-[#355f73]"><InteractiveIcon icon={ShieldCheck} size={21} /></span><h2 className="mt-4 text-base font-semibold text-[#173447]">当前没有可操作的 Token 后台接口</h2><p className="mt-2 text-sm leading-6 text-[#78909c]">此页仅保留权限入口，不展示虚构数据。接入发行、冻结与链上审计接口后再开放操作。</p></div></AdminPanel>
    </AdminPage>
  );
}

function messageFor(error: unknown) {
  return error instanceof Error ? error.message : "请求未完成";
}
