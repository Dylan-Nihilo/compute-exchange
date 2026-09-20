import type {Metadata} from "next";

import {LeadCaptureForm} from "@/components/leads/lead-capture-form";

export const metadata: Metadata = {title: "组网与机电安装服务 · OmniS"};

const services = [
  {name: "机房规划咨询", stage: "前期", detail: "选址评估、容量规划、机柜布局与综合布线设计"},
  {name: "高低压配电系统", stage: "核心", detail: "变压器、配电柜、UPS、电池组、柴油发电机"},
  {name: "暖通制冷系统", stage: "核心", detail: "精密空调、冷冻水系统、列间制冷与液冷方案"},
  {name: "弱电与综合布线", stage: "配套", detail: "光纤部署、铜缆布线、机柜内跳线与标签管理"},
  {name: "消防与安防系统", stage: "配套", detail: "气体灭火、极早期烟感、门禁监控、动环监控"},
  {name: "机电运维与改造", stage: "长期", detail: "定期巡检、故障响应、扩容改造与能效优化"},
] as const;

export default function ConstructionBrokerPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">组网与机电安装服务</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          机房规划咨询 · 高低压配电 · 暖通制冷 · 弱电布线 · 消防安防。从设计到施工验收的一站式工程项目整合。
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-label="服务范围" className="grid gap-4 sm:grid-cols-2">
          {services.map((item) => (
            <article className="rounded-2xl border border-border bg-white p-5" key={item.name}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">{item.name}</h2>
                <span className="rounded-full bg-[#e7f2f5] px-2.5 py-0.5 text-xs text-[#24546b]">{item.stage}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
            </article>
          ))}
          <p className="text-xs leading-5 text-muted sm:col-span-2">
            平台整合合作施工方资源提供项目居间服务，工程报价与工期以施工方现场勘察后的正式方案为准。
          </p>
        </section>

        <LeadCaptureForm
          amountLabel="项目预算"
          amountOptions={["100 万以内", "100-500 万", "500-2000 万", "2000 万以上"]}
          descriptionPlaceholder="请说明项目所在地、机房规模（机柜数/功率）、涉及的系统（配电/制冷/布线等）与期望开工时间"
          leadType="construction"
          source="construction_page"
          subtitle="提交后进入平台 CRM，顾问将在 1 个工作日内联系你"
          termLabel="期望工期"
          termOptions={["1 个月以内", "1-3 个月", "3-6 个月", "6 个月以上"]}
          title="建设需求登记"
        />
      </div>
    </main>
  );
}
