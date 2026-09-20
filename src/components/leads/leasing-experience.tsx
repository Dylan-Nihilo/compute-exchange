"use client";

import {Building2, Check, ClipboardList, Cpu, Handshake, PlugZap, ShieldCheck} from "lucide";
import Link from "next/link";
import {useState} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";

import {CollateralLookup} from "./collateral-lookup";
import {LeadCaptureForm} from "./lead-capture-form";
import styles from "./leasing.module.css";

const plans = [
  {value: "直租", number: "01", name: "采购新设备", type: "直接融资租赁", description: "为新建或扩容项目采购设备，与资方沟通设备购置及租赁安排。", detail: "适合新增设备投入"},
  {value: "回租", number: "02", name: "盘活已有设备", type: "售后回租", description: "以已有设备为基础，评估售后回租安排，兼顾设备使用与资金需求。", detail: "适合存量资产盘活"},
  {value: "经营性租赁", number: "03", name: "阶段性使用设备", type: "经营性租赁", description: "围绕项目周期沟通设备租用方案，明确租期、服务与期满处置方式。", detail: "适合项目制与阶段性扩容"},
] as const;

const disclaimer = "融资租赁服务由持牌资方提供。平台仅提供信息登记与居间服务，不从事放贷、吸收资金或提供担保，不承诺融资额度与利率。具体条件以资方尽调、审批及正式合同为准。";

export function LeasingExperience() {
  const [intent, setIntent] = useState("待咨询");

  return <main className={styles.page}>
    <div className={styles.container}>
      <nav aria-label="面包屑" className={styles.breadcrumb}><Link href="/">首页</Link><span aria-hidden="true">/</span><span aria-current="page">设备融资租赁</span></nav>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>企业设备服务</p>
          <h1>设备融资租赁</h1>
          <p className={styles.intro}>从新设备采购到存量资产盘活，<br className="hidden sm:block" />登记你的需求，由平台协助对接合适的资方。</p>
          <div className={styles.heroActions}><a href="#leasing-enquiry">登记租赁需求 <span aria-hidden="true">↗</span></a><a href="#registration-lookup">查询登记资料 <span aria-hidden="true">↓</span></a></div>
        </div>
        <div className={styles.assets} aria-label="服务设备范围">
          <p>围绕设备，连接资金与业务</p>
          <ul>
            <li><InteractiveIcon icon={Cpu} size={19} /><span>GPU 服务器</span></li>
            <li><InteractiveIcon icon={PlugZap} size={19} /><span>机电设备</span></li>
            <li><InteractiveIcon icon={Building2} size={19} /><span>数据中心基础设施</span></li>
          </ul>
        </div>
      </header>

      <fieldset className={styles.scenarios}>
        <legend><span className={styles.sectionNumber}>01</span>选择你的设备需求</legend>
        <p className={styles.sectionDescription}>选择更接近的场景，方便后续沟通；具体方案由资方评估确定。</p>
        <div className={styles.planGrid}>
          {plans.map((plan) => <label className={styles.plan} data-selected={intent === plan.value} key={plan.value}>
            <input type="radio" name="leasing-intent" value={plan.value} checked={intent === plan.value} onChange={() => setIntent(plan.value)} />
            <div className={styles.planTop}><span>{plan.type}</span><span className={styles.radioMark}>{intent === plan.value ? <InteractiveIcon icon={Check} size={12} /> : null}</span></div>
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <div className={styles.planBottom}><span>{plan.detail}</span><span aria-hidden="true">{plan.number}</span></div>
          </label>)}
        </div>
        <label className={styles.unsure}><input type="radio" name="leasing-intent" value="待咨询" checked={intent === "待咨询"} onChange={() => setIntent("待咨询")} /><span>暂未确定，先沟通设备与资金需求</span></label>
      </fieldset>

      <section className={styles.enquirySection} aria-labelledby="leasing-enquiry-heading" id="leasing-enquiry">
        <h2 id="leasing-enquiry-heading" className={styles.sectionHeading}><span className={styles.sectionNumber}>02</span>登记租赁需求</h2>
        <div className={styles.enquiryGrid}>
          <LeadCaptureForm
            className={styles.leadForm}
            amountLabel="设备金额 / 融资需求（选填）"
            amountOptions={["100 万以内", "100-500 万", "500-1000 万", "1000-3000 万", "3000 万以上"]}
            companyRequired
            descriptionPlaceholder="设备型号、数量、新旧情况，以及你希望解决的资金或交付需求"
            disclaimer="提交后，平台将依据上述信息与你联系。请确认企业名称与联系方式准确。"
            intentValue={intent}
            leadType="finance_lease"
            source="leasing_page"
            subtitle={`当前意向：${intent === "待咨询" ? "先沟通需求" : intent}。企业名称、联系人与电话为必填项。`}
            termLabel="期望租期（选填）"
            termOptions={["6 个月以内", "6-12 个月", "1-2 年", "2-3 年", "3-5 年"]}
            title="留下需求，开始沟通"
          />
          <aside className={styles.nextSteps} aria-label="提交后的服务流程">
            <div className={styles.asideHeading}><InteractiveIcon icon={Handshake} size={23} /><span>接下来会发生什么</span></div>
            <ol>
              <li><span>1</span><div><h3>平台确认需求</h3><p>沟通企业情况、设备信息与期望租期，补充必要资料。</p></div></li>
              <li><span>2</span><div><h3>对接资方评估</h3><p>资方独立开展尽调与评估，确认可提供的租赁条件。</p></div></li>
              <li><span>3</span><div><h3>线下确认方案</h3><p>租金、期限及合同条款，由你与资方进一步确认。</p></div></li>
            </ol>
            <div className={styles.boundary}><InteractiveIcon icon={ShieldCheck} size={18} /><p>这里登记的是咨询需求。提交成功不代表资方授信、审批通过或已签订租赁合同。</p></div>
            <a className={styles.lookupLink} href="#registration-lookup"><InteractiveIcon icon={ClipboardList} size={17} /><span>想先了解设备登记情况？<strong>查看平台已收录的登记资料 <span aria-hidden="true">↗</span></strong></span></a>
          </aside>
        </div>
      </section>

      <CollateralLookup />
      <footer className={styles.disclaimer}><InteractiveIcon icon={ShieldCheck} size={18} /><div><strong>服务说明</strong><p>{disclaimer}</p></div></footer>
    </div>
  </main>;
}
