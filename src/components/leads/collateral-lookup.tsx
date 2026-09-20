"use client";

import {useMutation} from "@tanstack/react-query";
import {Button} from "@heroui/react";
import {FileSearch, Info, Search} from "lucide";
import {useState} from "react";
import {z} from "zod";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {ListPagination} from "@/components/workspace/ui/list-pagination";

import styles from "./leasing.module.css";

const registrationSchema = z.object({
  reg_no: z.string(), reg_type: z.string(), lessor_name: z.string(), lessee_name: z.string(),
  collateral_desc: z.string(), reg_start_date: z.string(), reg_end_date: z.string(),
  display_status: z.string(), verified_at: z.string().optional(),
});
const responseSchema = z.object({
  code: z.number(), message: z.string().optional(),
  data: z.object({
    list: z.array(registrationSchema), total: z.number().int().nonnegative(),
    page: z.number().int().positive(), page_size: z.number().int().positive(), disclaimer: z.string(),
  }).nullable().optional(),
});
const regTypeCopy: Record<string, string> = {finance_lease: "融资租赁", mortgage: "抵押", factoring: "保理", other: "其他"};
const statusCopy: Record<string, string> = {valid: "有效", expired: "已过期", cancelled: "已注销"};
type LookupInput = {lessee_name: string; lessee_uscc: string; page: number};

async function queryCollateral(input: LookupInput) {
  const params = new URLSearchParams({page: String(input.page)});
  if (input.lessee_name) params.set("lessee_name", input.lessee_name);
  if (input.lessee_uscc) params.set("lessee_uscc", input.lessee_uscc);
  let response: Response;
  try {
    response = await fetch(`/api/collateral?${params}`, {cache: "no-store"});
  } catch {
    throw new Error("查询服务暂不可用，请稍后再试");
  }
  const parsed = responseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) throw new Error("查询结果暂时无法读取，请重新查询");
  if (!response.ok || parsed.data.code !== 0 || !parsed.data.data) {
    throw new Error(parsed.data.message || "查询失败，请稍后再试");
  }
  return parsed.data.data;
}

// Queries the platform's manually recorded data, never an official live registry.
export function CollateralLookup() {
  const [lesseeName, setLesseeName] = useState("");
  const [lesseeUscc, setLesseeUscc] = useState("");
  const mutation = useMutation({mutationFn: queryCollateral});

  return <section aria-labelledby="registration-heading" className={styles.lookup} id="registration-lookup">
    <header className={styles.lookupHeader}><h2 id="registration-heading">登记资料查询</h2><span className={styles.manualBadge}>平台人工核录</span></header>
    <p className={styles.lookupDescription}>按承租人名称或统一社会信用代码，查找平台已收录的融资租赁、抵押与保理登记资料。</p>
    <div className={styles.sourceNotice}><InteractiveIcon icon={Info} size={15} /><p>资料由平台依据中登网查询结果人工录入，仅供参考，请以官方系统实时查询结果为准。</p></div>
    <form className={styles.lookupForm} onSubmit={(event) => {
      event.preventDefault();
      if (mutation.isPending || (!lesseeName.trim() && !lesseeUscc.trim())) return;
      mutation.mutate({lessee_name: lesseeName.trim(), lessee_uscc: lesseeUscc.trim(), page: 1});
    }}>
      <div className={styles.lookupField}><label htmlFor="lessee-name">承租人名称</label><input id="lessee-name" disabled={mutation.isPending} maxLength={128} name="lessee_name" placeholder="企业名称，可按名称前缀查询" value={lesseeName} onChange={(event) => setLesseeName(event.target.value)} /></div>
      <div className={styles.lookupField}><label htmlFor="lessee-uscc">统一社会信用代码</label><input id="lessee-uscc" disabled={mutation.isPending} maxLength={18} minLength={8} pattern="[0-9A-Za-z]{8,18}" name="lessee_uscc" placeholder="输入统一社会信用代码" value={lesseeUscc} onChange={(event) => setLesseeUscc(event.target.value)} /></div>
      <Button isDisabled={mutation.isPending || (!lesseeName.trim() && !lesseeUscc.trim())} isPending={mutation.isPending} type="submit"><InteractiveIcon icon={Search} size={15} />{mutation.isPending ? "正在查询…" : "查询资料"}</Button>
    </form>
    <p className={styles.lookupHint}>至少填写一项；同时填写时，将查询同时匹配两项条件的记录。</p>
    {mutation.isPending ? <p className="mt-5 text-sm text-muted" role="status">正在查询登记资料…</p> : null}
    {mutation.isError ? <p className="mt-5 text-sm text-danger" role="alert">{mutation.error.message}。你填写的查询条件已保留。</p> : null}
    {mutation.isSuccess ? <div className="mt-5" aria-live="polite">
      {mutation.data.list.length ? <>
        <p className="text-xs text-muted">为「{mutation.variables.lessee_name || mutation.variables.lessee_uscc}」找到 {mutation.data.total} 条登记资料</p>
        <ol className={styles.records}>{mutation.data.list.map((item) => <li className={styles.record} key={item.reg_no}>
          <header><div><span className="text-muted">{regTypeCopy[item.reg_type] ?? item.reg_type} · 登记编号</span><strong>{item.reg_no}</strong></div><span className={styles.recordStatus} data-status={item.display_status}>{statusCopy[item.display_status] ?? item.display_status}</span></header>
          <dl><div><dt>出租人 / 权利人</dt><dd>{item.lessor_name}</dd></div><div><dt>承租人</dt><dd>{item.lessee_name}</dd></div><div><dt>登记标的物</dt><dd>{item.collateral_desc || "未填写"}</dd></div><div><dt>登记期限</dt><dd>{item.reg_start_date || "未填写"} — {item.reg_end_date || "未填写"}</dd></div></dl>
          <p className={styles.recordNote}>人工核验日期：{item.verified_at || "未填写"}</p>
        </li>)}</ol>
        <ListPagination page={mutation.data.page} totalPages={Math.max(1, Math.ceil(mutation.data.total / mutation.data.page_size))} onPageChange={(page) => {if (!mutation.isPending) mutation.mutate({...mutation.variables, page});}} />
      </> : <div className={styles.lookupEmpty}><InteractiveIcon icon={FileSearch} size={22} /><div><h3>平台暂未收录匹配记录</h3><p>本次未找到「{mutation.variables.lessee_name || mutation.variables.lessee_uscc}」的登记资料。这不代表官方系统没有登记，仍需以官方查询结果核实。</p></div></div>}
      <p className="mt-4 text-[11px] leading-6 text-muted">{mutation.data.disclaimer}</p>
    </div> : null}
  </section>;
}
