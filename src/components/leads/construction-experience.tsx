"use client";

import {Building2, Check, ClipboardList, DraftingCompass, HardHat, Layers, Network, PlugZap, ShieldCheck, Snowflake, Wrench} from "lucide";
import Link from "next/link";
import {useState} from "react";

import {InteractiveIcon} from "@/components/system/interactive-icon";

import {LeadCaptureForm} from "./lead-capture-form";
import base from "./leasing.module.css";
import styles from "./construction.module.css";

const services = [
  {name: "机房规划咨询", icon: DraftingCompass, detail: "容量规划、机柜布局与系统方案梳理"},
  {name: "高低压配电系统", icon: PlugZap, detail: "变配电、UPS、电池组与备用电源"},
  {name: "暖通制冷系统", icon: Snowflake, detail: "精密空调、冷冻水与液冷系统"},
  {name: "弱电与综合布线", icon: Network, detail: "光纤、铜缆、机柜布线与网络接入"},
  {name: "消防与安防系统", icon: ShieldCheck, detail: "消防、门禁、监控与动环系统"},
  {name: "机电运维与改造", icon: Wrench, detail: "巡检维护、既有系统改造与扩容"},
] as const;
const fullProject = "整体建设 / 施工总包";

export function ConstructionExperience() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggleService = (name: string) => setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);

  return <main className={base.page}>
    <div className={base.container}>
      <nav aria-label="面包屑" className={base.breadcrumb}><Link href="/">首页</Link><span aria-hidden="true">/</span><span aria-current="page">组网与机电安装</span></nav>
      <header className={base.hero}>
        <div>
          <p className={base.eyebrow}>机房建设与改造</p>
          <h1 className={styles.title}>组网与机电安装<span>服务</span></h1>
          <p className={base.intro}>从新建机房到既有系统扩容，<br className="hidden sm:block" />说明你的工程需求，平台协助对接施工合作方。</p>
          <div className={base.heroActions}><a href="#construction-enquiry">登记建设需求 <span aria-hidden="true">↗</span></a><a href="#construction-process">了解对接流程 <span aria-hidden="true">↓</span></a></div>
        </div>
        <div className={base.assets} aria-label="适用项目">
          <p>围绕机房建设的不同阶段</p>
          <ul>
            <li><InteractiveIcon icon={Building2} size={19} /><span>新建机房</span></li>
            <li><InteractiveIcon icon={Layers} size={19} /><span>系统扩容</span></li>
            <li><InteractiveIcon icon={Wrench} size={19} /><span>运维改造</span></li>
          </ul>
        </div>
      </header>

      <fieldset className={base.scenarios}>
        <legend><span className={base.sectionNumber}>01</span>选择工程范围</legend>
        <p className={base.sectionDescription}>可选择多项。范围暂未确定，也可以直接登记项目情况。</p>
        <div className={styles.serviceGrid}>
          {services.map((service) => <label className={styles.service} data-selected={selected.includes(service.name)} key={service.name}>
            <input aria-label={service.name} checked={selected.includes(service.name)} name="construction-scope" onChange={() => toggleService(service.name)} type="checkbox" value={service.name} />
            <span className={styles.serviceIcon}><InteractiveIcon icon={service.icon} size={20} /></span>
            <span className={styles.serviceText}><strong>{service.name}</strong><span>{service.detail}</span></span>
            <span className={styles.checkMark}>{selected.includes(service.name) ? <InteractiveIcon icon={Check} size={12} /> : null}</span>
          </label>)}
        </div>
        <div className={styles.scopeFooter}>
          <label className={base.unsure}><input checked={selected.includes(fullProject)} onChange={() => toggleService(fullProject)} type="checkbox" /><span>整体建设 / 施工总包，需要多系统统筹</span></label>
          <p role="status">{selected.length ? `已选择 ${selected.length} 项工程需求` : "工程范围可在后续沟通中进一步确认"}</p>
        </div>
      </fieldset>

      <section className={base.enquirySection} aria-labelledby="construction-enquiry-heading" id="construction-enquiry">
        <h2 className={base.sectionHeading} id="construction-enquiry-heading"><span className={base.sectionNumber}>02</span>登记项目需求</h2>
        <div className={base.enquiryGrid}>
          <LeadCaptureForm
            className={base.leadForm}
            amountLabel="项目预算（选填）"
            amountOptions={["100 万以内", "100-500 万", "500-2000 万", "2000 万以上"]}
            descriptionPlaceholder="例如期望开工时间、现有系统情况、现场施工限制，以及需要重点解决的问题"
            disclaimer="提交后，平台将通过你填写的联系方式沟通项目情况。请确认联系人与电话准确。"
            intentValue={selected.join("、")}
            leadType="construction"
            source="construction_page"
            subtitle={selected.length ? `已选工程范围：${selected.join("、")}。联系人与电话为必填项。` : "填写项目情况与联系方式，方便平台了解需求。联系人与电话为必填项。"}
            termLabel="期望工期（选填）"
            termOptions={["1 个月以内", "1-3 个月", "3-6 个月", "6 个月以上"]}
            title="从项目情况开始沟通"
          />
          <aside aria-label="项目对接流程" className={base.nextSteps} id="construction-process">
            <div className={base.asideHeading}><InteractiveIcon icon={HardHat} size={23} /><span>项目如何推进</span></div>
            <ol>
              <li><span>1</span><div><h3>梳理项目需求</h3><p>平台沟通项目地点、建设规模、涉及系统及预算工期。</p></div></li>
              <li><span>2</span><div><h3>对接施工合作方</h3><p>沟通技术条件与现场情况，按需要进一步安排勘察。</p></div></li>
              <li><span>3</span><div><h3>确认方案与合作</h3><p>施工方提出正式方案，双方确认范围、报价、工期与验收约定。</p></div></li>
            </ol>
            <div className={base.boundary}><InteractiveIcon icon={ShieldCheck} size={18} /><p>提交的是项目咨询需求。工程报价、开工时间和施工周期，以现场情况及双方确认的正式方案为准。</p></div>
            <div className={styles.preparation}><InteractiveIcon icon={ClipboardList} size={18} /><div><strong>沟通前可以准备</strong><p>项目平面图、现有设备清单，以及已知的电力容量与制冷条件。</p></div></div>
          </aside>
        </div>
      </section>
      <footer className={base.disclaimer}><InteractiveIcon icon={ShieldCheck} size={18} /><div><strong>服务说明</strong><p>平台提供工程项目需求登记与居间对接服务，具体设计、施工范围、报价、工期和验收标准由合作施工方与需求方协商确认。提交需求不代表施工方已接单或已安排开工。</p></div></footer>
    </div>
  </main>;
}
