"use client";

import {Check, ClipboardList, Cpu, Handshake, HardDrive, PlugZap, ShieldCheck, Store} from "lucide";
import Link from "next/link";
import {useState} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";

import {LeadCaptureForm} from "./lead-capture-form";
import base from "./leasing.module.css";
import styles from "./equipment.module.css";

const plans = [
  {value: "一手设备采购", number: "01", name: "采购全新设备", type: "一手 · 原厂质保", description: "原厂或授权渠道的全新设备，平台组织比价议价与批量集采，交付验收有保障。", detail: "适合新建与扩容项目"},
  {value: "二手设备采购", number: "02", name: "采购二手设备", type: "二手 · 明示成色", description: "二手设备明示出厂年份与使用情况，支持线下验货，平台协助评估与质保安排。", detail: "适合控制预算、快速到货"},
  {value: "设备处置挂牌", number: "03", name: "出售 / 处置设备", type: "处置 · 挂牌撮合", description: "将闲置或退役设备挂牌到设备市场，由平台对接买家并跟进撮合成交。", detail: "适合盘活存量资产"},
] as const;

const supplierSteps = [
  {name: "成为供给方", detail: "完成企业认证与供给方入驻申请，由运营审核开通。"},
  {name: "发布设备商品", detail: "一手 / 二手分别标注，二手需填报出厂年份与使用情况，商品经运营审核后上架。"},
  {name: "接收询价", detail: "买家询价直达你的工作台，同时进入平台 CRM 由顾问协同跟进。"},
  {name: "线下成交", detail: "验货、议价与合同在线下完成，平台采购顾问协助促成交易。"},
] as const;

const disclaimer = "平台为设备采购与处置提供信息登记与居间撮合服务，不对设备质量、价格与货期作出承诺；具体以供需双方线下验货、议价及正式合同为准。设备类交易金额大、需线下验货，v1 不支持在线支付。";

export function EquipmentExperience() {
  const [intent, setIntent] = useState("待咨询");

  return <main className={base.page}>
    <div className={base.container}>
      <nav aria-label="面包屑" className={base.breadcrumb}><Link href="/">首页</Link><span aria-hidden="true">/</span><span aria-current="page">设备整包销售</span></nav>
      <header className={base.hero}>
        <div>
          <p className={base.eyebrow}>企业设备服务</p>
          <h1>设备整包销售</h1>
          <p className={base.intro}>一手、二手设备的采购与处置，<br className="hidden sm:block" />从询价比价到交付验收，由平台居间撮合、采购顾问全程跟进。</p>
          <div className={base.heroActions}><a href="#equipment-enquiry">登记采购需求 <span aria-hidden="true">↗</span></a><Link href="/equipment-market">进入设备市场 <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className={base.assets} aria-label="服务设备范围">
          <p>覆盖数据中心的主要设备</p>
          <ul>
            <li><InteractiveIcon icon={Cpu} size={19} /><span>GPU / CPU 服务器</span></li>
            <li><InteractiveIcon icon={HardDrive} size={19} /><span>存储与网络设备</span></li>
            <li><InteractiveIcon icon={PlugZap} size={19} /><span>制冷、配电与机柜</span></li>
          </ul>
        </div>
      </header>

      <fieldset className={base.scenarios}>
        <legend><span className={base.sectionNumber}>01</span>选择你的设备需求</legend>
        <p className={base.sectionDescription}>选择更接近的场景，方便顾问跟进；具体货源与价格以正式报价为准。</p>
        <div className={base.planGrid}>
          {plans.map((plan) => <label className={base.plan} data-selected={intent === plan.value} key={plan.value}>
            <input type="radio" name="equipment-intent" value={plan.value} checked={intent === plan.value} onChange={() => setIntent(plan.value)} />
            <div className={base.planTop}><span>{plan.type}</span><span className={base.radioMark}>{intent === plan.value ? <InteractiveIcon icon={Check} size={12} /> : null}</span></div>
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <div className={base.planBottom}><span>{plan.detail}</span><span aria-hidden="true">{plan.number}</span></div>
          </label>)}
        </div>
        <label className={base.unsure}><input type="radio" name="equipment-intent" value="待咨询" checked={intent === "待咨询"} onChange={() => setIntent("待咨询")} /><span>暂未确定，先沟通设备与预算需求</span></label>
      </fieldset>

      <section className={base.enquirySection} aria-labelledby="equipment-enquiry-heading" id="equipment-enquiry">
        <h2 id="equipment-enquiry-heading" className={base.sectionHeading}><span className={base.sectionNumber}>02</span>登记采购需求</h2>
        <div className={base.enquiryGrid}>
          <LeadCaptureForm
            className={base.leadForm}
            amountLabel="采购预算（选填）"
            amountOptions={["50 万以内", "50-200 万", "200-500 万", "500-1000 万", "1000 万以上"]}
            descriptionPlaceholder="请说明设备类型与型号（如 8 卡 H100 整机 ×4）、一手/二手偏好、期望交付时间与地点"
            disclaimer="提交后，平台采购顾问将通过你填写的联系方式与你沟通。请确认联系人与电话准确。"
            intentValue={intent}
            leadType="equipment"
            source="equipment_page"
            subtitle={`当前意向：${intent === "待咨询" ? "先沟通需求" : intent}。联系人与电话为必填项。`}
            termLabel="期望交付时间（选填）"
            termOptions={["2 周以内", "2-4 周", "1-3 个月", "3 个月以上"]}
            title="留下需求，开始沟通"
          />
          <aside className={base.nextSteps} aria-label="提交后的服务流程">
            <div className={base.asideHeading}><InteractiveIcon icon={Handshake} size={23} /><span>采购如何推进</span></div>
            <ol>
              <li><span>1</span><div><h3>平台确认需求</h3><p>沟通设备型号、数量、预算与交付要求，明确一手/二手偏好。</p></div></li>
              <li><span>2</span><div><h3>比价与报价</h3><p>对接多家供应方与厂商渠道，组织比价并出具报价方案。</p></div></li>
              <li><span>3</span><div><h3>线下签约与交付</h3><p>验货、合同与物流在线下完成，上架验收后由原厂与平台协同售后。</p></div></li>
            </ol>
            <div className={base.boundary}><InteractiveIcon icon={ShieldCheck} size={18} /><p>这里登记的是采购咨询需求。提交成功不代表已锁定货源或价格，设备类交易不支持在线支付。</p></div>
            <Link className={base.lookupLink} href="/equipment-market"><InteractiveIcon icon={ClipboardList} size={17} /><span>想先看看在售设备？<strong>进入设备市场，浏览一手/二手挂牌 <span aria-hidden="true">↗</span></strong></span></Link>
          </aside>
        </div>
      </section>

      <section className={styles.supplier} aria-labelledby="equipment-supplier-heading" id="equipment-supplier">
        <h2 id="equipment-supplier-heading" className={base.sectionHeading}><span className={base.sectionNumber}>03</span>成为设备供应方</h2>
        <p className={base.sectionDescription}>厂商与持有闲置设备的企业，入驻后可在设备市场发布商品，由平台带来询价与撮合服务。</p>
        <div className={styles.supplierPanel}>
          <ol className={styles.supplierSteps}>
            {supplierSteps.map((step, index) => <li key={step.name}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.name}</h3>
              <p>{step.detail}</p>
            </li>)}
          </ol>
          <div className={styles.supplierActions}>
            <Link className={styles.supplierPrimary} href="/supplier/apply"><InteractiveIcon icon={Store} size={17} /><span>申请成为供给方</span></Link>
            <Link className={styles.supplierSecondary} href="/console/supplier/equipments/new">已是供给方？发布设备商品 <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <footer className={base.disclaimer}><InteractiveIcon icon={ShieldCheck} size={18} /><div><strong>服务说明</strong><p>{disclaimer}</p></div></footer>
    </div>
  </main>;
}
