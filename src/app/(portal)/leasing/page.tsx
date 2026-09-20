import type {Metadata} from "next";

import {CollateralLookup} from "@/components/leads/collateral-lookup";
import {LeadCaptureForm} from "@/components/leads/lead-capture-form";

export const metadata: Metadata = {title: "设备融资租赁 · OmniS"};

const plans = [
  {
    name: "直接融资租赁（直租）",
    fit: "新建算力中心的首次设备采购",
    detail: "平台协助对接资方代为采购设备，租期内按月支付租金，期满设备归承租方所有。",
    term: "常见期限 2-5 年 · 首付比例以资方审批为准",
  },
  {
    name: "售后回租（回租）",
    fit: "已有设备、需要盘活资产",
    detail: "将自有设备出售给资方后租回继续使用，释放沉淀在设备上的流动资金。",
    term: "常见期限 2-5 年 · 融资比例以设备评估为准",
  },
  {
    name: "经营性租赁",
    fit: "短期扩容、试运营阶段",
    detail: "短周期灵活租赁，租期结束设备归还资方，无残值处置压力。",
    term: "常见期限 6 个月-2 年 · 灵活退出",
  },
] as const;

const disclaimer =
  "融资租赁服务由持牌金融机构提供，平台仅提供信息登记与居间撮合服务，不吸收资金、不提供担保、不承诺融资额度与利率；最终方案以资方尽调与审批结果为准。";

export default function LeasingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">设备融资租赁</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          GPU 服务器 · 机电设备 · 数据中心基础设施。直租 / 回租 / 经营性租赁多方案，由持牌资方提供资金与审批。
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-label="融资方案" className="space-y-4">
          {plans.map((plan) => (
            <article className="rounded-2xl border border-border bg-white p-6" key={plan.name}>
              <h2 className="text-lg font-semibold text-foreground">{plan.name}</h2>
              <p className="mt-1 text-xs font-medium text-accent">适用：{plan.fit}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{plan.detail}</p>
              <p className="mt-2 text-xs text-muted">{plan.term}</p>
            </article>
          ))}
          <p className="text-xs leading-5 text-muted">{disclaimer}</p>
        </section>

        <LeadCaptureForm
          amountLabel="融资金额"
          amountOptions={["100 万以内", "100-500 万", "500-1000 万", "1000-3000 万", "3000 万以上"]}
          companyRequired
          descriptionPlaceholder="请说明标的物（设备型号/数量/新旧）、是否已在中登网登记、期望放款时间等"
          disclaimer={disclaimer}
          intentLabel="意向方案"
          intentOptions={["直租", "回租", "经营性租赁", "待咨询"]}
          leadType="finance_lease"
          source="leasing_page"
          subtitle="提交后进入平台 CRM，顾问将在 1 个工作日内联系你"
          termLabel="期望期限"
          termOptions={["6 个月以内", "6-12 个月", "1-2 年", "2-3 年", "3-5 年"]}
          title="融资需求登记"
        />
      </div>

      <div className="mt-8">
        <CollateralLookup />
      </div>
    </main>
  );
}
