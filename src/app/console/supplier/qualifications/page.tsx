"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Button, Chip, Input, Label, Skeleton, TextField} from "@heroui/react";
import {useEffect, useState} from "react";

import {ErrorState} from "@/components/system/operation-state";
import {EmptyState} from "@/components/workspace/ui/empty-state";
import {GlassCard} from "@/components/workspace/ui/glass-card";
import {WorkspacePageHeader} from "@/components/workspace/ui/workspace-page-header";
import {formatDate, formatDateTime} from "@/lib/format/date";
import {notify} from "@/lib/notify";
import {
  fetchMyQualifications,
  qualificationStatusCopy,
  submitQualification,
  type SubmitQualificationInput,
} from "@/lib/supplier-workspace";

const qualificationsKey = ["supplier", "qualifications"] as const;

const qualTypeOptions = [
  {id: "idc_license", label: "IDC 经营许可证"},
  {id: "telecom_license", label: "电信业务资质"},
  {id: "power_cooling", label: "电力与散热说明"},
  {id: "other", label: "其他证明材料"},
] as const;

const inputClass =
  "h-10 rounded-xl border border-[#afc4ce]/45 bg-white/80 px-3.5 text-sm text-[#24495d] placeholder:text-[#9cb0ba]";

const statusTone = {
  pending: "warning",
  approved: "success",
  expiring: "warning",
  expired: "danger",
  rejected: "danger",
} as const;

export default function SupplierQualificationsPage() {
  const queryClient = useQueryClient();
  const [qualType, setQualType] = useState("idc_license");
  const [certName, setCertName] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [certUrl, setCertUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: qualificationsKey,
    queryFn: () => fetchMyQualifications(),
  });

  useEffect(() => {
    if (!listQuery.data || !window.location.hash.startsWith("#qualification-")) return;
    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({block: "center"});
    target?.focus({preventScroll: true});
  }, [listQuery.data]);

  const submitMutation = useMutation({
    mutationFn: (input: SubmitQualificationInput) => submitQualification(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: qualificationsKey});
      setCertName("");
      setCertNumber("");
      setCertUrl("");
      setExpiresAt("");
      setFormError(null);
      notify.success("资质已提交, 请等待平台审核");
    },
    onError: (error) =>
      notify.error(error instanceof Error ? error.message : "资质提交失败"),
  });

  const submit = () => {
    if (!certName.trim()) return setFormError("请填写证照名称");
    if (!certNumber.trim()) return setFormError("请填写证照编号");
    if (!certUrl.trim()) return setFormError("请填写证照附件链接");
    setFormError(null);
    submitMutation.mutate({
      qual_type: qualType,
      cert_name: certName.trim(),
      cert_number: certNumber.trim(),
      cert_url: certUrl.trim(),
      expires_at: expiresAt || null,
    });
  };

  const list = listQuery.data ?? [];

  return (
    <section className="mx-auto flex w-full max-w-[1228px] flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 lg:px-8">
      <WorkspacePageHeader title="机房资质" />

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">提交资质</h2>
        <p className="mt-1 text-xs text-[#78909c]">
          补充经营许可证、电力与散热等证明材料，提交后进入平台审核。
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-medium text-[#24495d]">资质类型</Label>
            <div className="flex flex-wrap gap-2">
              {qualTypeOptions.map((option) => (
                <button
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    qualType === option.id
                      ? "bg-[#173447] text-white"
                      : "border border-[#dce9ee] bg-white/60 text-[#5e7786] hover:bg-white/80"
                  }`}
                  key={option.id}
                  onClick={() => setQualType(option.id)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <TextField fullWidth className="gap-1.5" value={certName} variant="secondary" onChange={setCertName}>
            <Label className="text-[13px] font-medium text-[#24495d]">证照名称</Label>
            <Input className={inputClass} placeholder="例如: 增值电信业务经营许可证" />
          </TextField>
          <TextField fullWidth className="gap-1.5" value={certNumber} variant="secondary" onChange={setCertNumber}>
            <Label className="text-[13px] font-medium text-[#24495d]">证照编号</Label>
            <Input autoComplete="off" className={inputClass} placeholder="许可证/证照编号" />
          </TextField>
          <TextField fullWidth className="gap-1.5" value={certUrl} variant="secondary" onChange={setCertUrl}>
            <Label className="text-[13px] font-medium text-[#24495d]">附件链接</Label>
            <Input autoComplete="off" className={inputClass} placeholder="https://…(证照扫描件地址)" />
          </TextField>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground" htmlFor="qualification-expiry">有效期至</label>
            <input
              className="h-10 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              id="qualification-expiry"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              aria-describedby="qualification-expiry-help"
            />
            <p className="text-xs text-muted" id="qualification-expiry-help">按证照填写到期日，无到期日可留空。</p>
          </div>
        </div>
        {formError ? (
          <p className="mt-3 text-xs text-[#c4392f]" role="alert">{formError}</p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <Button isPending={submitMutation.isPending} onPress={submit} variant="primary">
            {submitMutation.isPending ? "正在提交" : "提交审核"}
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="px-5 py-5 sm:px-6">
        <h2 className="text-[15px] font-semibold text-[#173447]">我的资质</h2>
        <div aria-busy={listQuery.isPending} className="mt-4 min-h-[160px]">
          {listQuery.isPending ? (
            <div className="space-y-3">
              {["s1", "s2"].map((key) => <Skeleton className="h-16 w-full rounded-xl" key={key} />)}
            </div>
          ) : listQuery.isError ? (
            <ErrorState
              description={listQuery.error instanceof Error ? listQuery.error.message : undefined}
              isPending={listQuery.isFetching}
              onRetry={() => void listQuery.refetch()}
              title="资质数据暂时不可用"
            />
          ) : list.length ? (
            <ul className="space-y-3">
              {list.map((item) => (
                <li
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[#dce9ee] bg-white/55 px-4 py-3"
                  id={`qualification-${item.id}`}
                  key={item.id}
                  tabIndex={-1}
                >
                  <Chip color={statusTone[item.status as keyof typeof statusTone] ?? "default"} variant="soft">
                    {qualificationStatusCopy[item.status] ?? item.status}
                  </Chip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#173447]">{item.cert_name}</p>
                    <p className="mt-0.5 text-xs text-[#78909c]">
                      {qualTypeOptions.find((option) => option.id === item.qual_type)?.label ?? item.qual_type}
                      {" · "}编号 {item.cert_number}
                      {" · "}提交于 {formatDateTime(item.created_at)}
                      {item.expires_at ? ` · 有效期至 ${formatDate(item.expires_at)}` : " · 未提供到期日"}
                    </p>
                    {item.status === "expiring" ? (
                      <p className="mt-1 text-xs text-warning">{item.expires_in_days === 0 ? "今天到期" : `距到期还有 ${item.expires_in_days} 天`}，请及时提交同类型新证照审核。</p>
                    ) : item.status === "expired" ? (
                      <p className="mt-1 text-xs text-danger">证照已过期，请确认同类型新证照已提交并通过审核。</p>
                    ) : null}
                    {item.status === "rejected" && item.rejected_reason ? (
                      <p className="mt-1 text-xs text-[#c4392f]">驳回原因: {item.rejected_reason}</p>
                    ) : null}
                  </div>
                  <a
                    className="text-xs font-medium text-[#1d63ae] hover:underline"
                    href={item.cert_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    查看附件 →
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="如需补充经营许可或机房证明，可在上方提交审核。"
              title="还没有资质记录"
            />
          )}
        </div>
      </GlassCard>
    </section>
  );
}
