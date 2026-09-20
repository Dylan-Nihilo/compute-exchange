"use client";

import {useMutation} from "@tanstack/react-query";
import {Button} from "@heroui/react";
import {z} from "zod";

const inputClass =
  "mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent";

const registrationSchema = z.object({
  reg_no: z.string(),
  reg_type: z.string(),
  lessor_name: z.string(),
  lessee_name: z.string(),
  collateral_desc: z.string(),
  reg_start_date: z.string(),
  reg_end_date: z.string(),
  display_status: z.string(),
});

const responseSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
  data: z
    .object({
      list: z.array(registrationSchema),
      total: z.number(),
      disclaimer: z.string(),
    })
    .nullable()
    .optional(),
});

const regTypeCopy: Record<string, string> = {
  finance_lease: "融资租赁",
  mortgage: "抵押",
  factoring: "保理",
  other: "其他",
};

const statusCopy: Record<string, string> = {
  valid: "有效",
  expired: "已过期",
  cancelled: "已注销",
};

async function queryCollateral(input: {lessee_name: string; lessee_uscc: string}) {
  const params = new URLSearchParams();
  if (input.lessee_name) params.set("lessee_name", input.lessee_name);
  if (input.lessee_uscc) params.set("lessee_uscc", input.lessee_uscc);
  let response: Response;
  try {
    response = await fetch(`/api/collateral?${params}`);
  } catch {
    throw new Error("查询服务暂不可用, 请稍后再试");
  }
  let parsed: z.infer<typeof responseSchema>;
  try {
    parsed = responseSchema.parse(await response.json());
  } catch {
    throw new Error("查询失败, 请稍后再试");
  }
  if (parsed.code !== 0 || !parsed.data) {
    throw new Error(parsed.message || "查询失败, 请稍后再试");
  }
  return parsed.data;
}

// 中登网(动产融资统一登记公示系统)登记查询。中登网无对外数据接口,
// 库内数据为平台运营人工录入并留痕, 页面必须明示该口径(合规红线)。
export function CollateralLookup() {
  const mutation = useMutation({mutationFn: queryCollateral});

  return (
    <section aria-label="中登网登记查询" className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold text-foreground">中登网动产融资登记查询</h2>
      <p className="mt-1 text-sm text-muted">
        查询承租人在中登网的融资租赁/抵押/保理登记情况，辅助判断标的物权属状态。
      </p>

      <form
        className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (mutation.isPending) return;
          const data = new FormData(event.currentTarget);
          const lesseeName = String(data.get("lessee_name") ?? "").trim();
          const lesseeUscc = String(data.get("lessee_uscc") ?? "").trim();
          if (!lesseeName && !lesseeUscc) return;
          mutation.mutate({lessee_name: lesseeName, lessee_uscc: lesseeUscc});
        }}
      >
        <label className="block text-sm font-medium text-foreground">
          承租人名称
          <input className={inputClass} maxLength={128} name="lessee_name" placeholder="如 某某智算科技有限公司" />
        </label>
        <label className="block text-sm font-medium text-foreground">
          统一社会信用代码
          <input className={inputClass} maxLength={18} name="lessee_uscc" placeholder="18 位" />
        </label>
        <div className="flex items-end">
          <Button className="w-full sm:w-auto" isPending={mutation.isPending} type="submit">
            查询
          </Button>
        </div>
      </form>
      <p className="mt-2 text-xs text-muted">两项条件至少填写一项。</p>

      {mutation.isError ? (
        <p className="mt-4 text-sm text-danger" role="alert">{mutation.error.message}</p>
      ) : null}

      {mutation.isSuccess ? (
        <div className="mt-5">
          {mutation.data.list.length ? (
            <div className="omnis-scrollbar-x">
              <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                <caption className="sr-only">登记查询结果</caption>
                <thead>
                  <tr className="h-10 bg-[#e5f3f8]/75 text-[12px] font-medium text-[#78909c]">
                    <th className="rounded-l-[12px] px-3" scope="col">登记编号</th>
                    <th className="px-3" scope="col">类型</th>
                    <th className="px-3" scope="col">出租人/权利人</th>
                    <th className="px-3" scope="col">承租人</th>
                    <th className="px-3" scope="col">标的物</th>
                    <th className="px-3" scope="col">登记期限</th>
                    <th className="rounded-r-[12px] px-3" scope="col">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {mutation.data.list.map((item) => (
                    <tr className="border-b border-[#dce9ee]/70 last:border-0" key={item.reg_no}>
                      <td className="px-3 py-3 font-medium text-[#173447]">{item.reg_no}</td>
                      <td className="px-3 py-3">{regTypeCopy[item.reg_type] ?? item.reg_type}</td>
                      <td className="px-3 py-3">{item.lessor_name}</td>
                      <td className="px-3 py-3">{item.lessee_name}</td>
                      <td className="max-w-56 px-3 py-3 break-words">{item.collateral_desc}</td>
                      <td className="px-3 py-3">{item.reg_start_date} ~ {item.reg_end_date}</td>
                      <td className="px-3 py-3">{statusCopy[item.display_status] ?? item.display_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted">未查询到相关登记记录。</p>
          )}
          <p className="mt-4 text-xs leading-5 text-muted">{mutation.data.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}
