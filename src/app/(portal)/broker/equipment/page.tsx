import type {Metadata} from "next";

import {LeadCaptureForm} from "@/components/leads/lead-capture-form";

export const metadata: Metadata = {title: "设备整包销售 · OmniS"};

const categories = [
  {name: "GPU 服务器", detail: "训练/推理整机与整柜方案，一手全新原厂质保，二手明示出厂年份与使用情况"},
  {name: "CPU 服务器与存储", detail: "通用算力、分布式存储、全闪阵列等数据中心主力设备"},
  {name: "网络设备", detail: "交换机、路由器、光模块与高速互联组网配套"},
  {name: "制冷与配电", detail: "精密空调、液冷方案、UPS、机柜等机房基础设施"},
] as const;

export default function EquipmentBrokerPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">设备整包销售</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          GPU 服务器 · CPU 服务器 · 网络设备 · 存储设备 · 配件耗材。厂商直供渠道，支持比价议价、集采交付与售后整合。
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-label="设备类目" className="space-y-4">
          {categories.map((item) => (
            <article className="rounded-2xl border border-border bg-white p-6" key={item.name}>
              <h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
            </article>
          ))}
          <p className="text-xs leading-5 text-muted">
            平台提供采购居间与交付协调服务，设备价格与货期以供应厂商正式报价为准。
          </p>
        </section>

        <LeadCaptureForm
          amountLabel="采购预算"
          amountOptions={["50 万以内", "50-200 万", "200-500 万", "500-1000 万", "1000 万以上"]}
          descriptionPlaceholder="请说明设备类型与型号（如 8 卡 H100 整机 ×4）、一手/二手偏好、期望交付时间与地点"
          leadType="equipment"
          source="equipment_page"
          subtitle="提交后进入平台 CRM，顾问将在 1 个工作日内联系你"
          title="设备采购需求登记"
        />
      </div>
    </main>
  );
}
