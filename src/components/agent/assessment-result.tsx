"use client";

import Link from "next/link";
import {useId} from "react";

import type {AgentSearchResult} from "@/lib/agent-search";
import {mapComputeProduct} from "@/lib/market-api";

import styles from "./compute-advisor.module.css";

const number = new Intl.NumberFormat("zh-CN", {maximumFractionDigits: 1});

export function AssessmentResult({result}: {result: AgentSearchResult}) {
  const group = useId();
  if (!result.relevant) return <div className={styles.rejection}><h3>再聊聊你的算力需求</h3><p>{result.reject_reason || "请描述需要运行的模型、应用或计算任务。"}</p></div>;
  const estimate = result.compute_estimate;

  return <div className={styles.result}>
    <h3 className={styles.conclusion}>{result.summary || "根据你的需求，可以从以下配置开始考虑。"}</h3>
    <dl className={styles.estimates}>
      {[["预计总显存", estimate.total_vram_gb, "GB"], ["参考单卡显存", estimate.per_card_vram_gb, "GB"], ["起步卡数", estimate.min_cards, "卡"]].map(([label, value, unit]) => <div key={String(label)}>
        <dt>{label}</dt><dd>{Number(value) > 0 ? <>{number.format(Number(value))}<span>{unit}</span></> : "待明确"}</dd>
      </div>)}
    </dl>

    <div className={styles.resultGroups}>
      {result.machine_plans.length ? <section className={styles.resultSection} aria-label="建议机器方案">
        <details name={group}>
          <summary className={styles.sectionLabel}><span>建议配置</span><span className={styles.sectionCount}>{result.machine_plans.length} 个方案</span></summary>
          <div className={styles.sectionBody}>
            {result.machine_plans.map((plan, index) => <article className={styles.plan} key={`${index}-${plan.gpu_model}`}>
              <div className={styles.planHeading}><span className={styles.planIndex}>0{index + 1}</span><h4>{plan.gpu_model}</h4><span className={styles.planName}>{plan.name || `方案 ${index + 1}`}</span></div>
              <p className={styles.planSpecs}><span><strong>{plan.cards}</strong> 卡</span><span><strong>{plan.nodes}</strong> 台</span>{plan.per_card_vram_gb > 0 ? <span>单卡 <strong>{number.format(plan.per_card_vram_gb)}</strong> GB</span> : null}</p>
              {plan.note ? <p className={styles.planNote}>{plan.note}</p> : null}
            </article>)}
            <p className={styles.caption}>配置供选型参考，可售规格与价格以商品为准。</p>
          </div>
        </details>
      </section> : null}

      <section className={styles.resultSection} aria-label="平台在售商品">
        <details name={group}>
          <summary className={styles.sectionLabel}><span>平台在售</span><span className={styles.sectionCount}>{result.matches.length ? `${result.matches.length} 个商品` : "暂无匹配"}</span></summary>
          <div className={styles.sectionBody}>
            {result.matches.length ? result.matches.map((match) => {
              const supply = mapComputeProduct(match.product);
              const unit = supply.unitLabel === "GPU" ? "卡" : supply.unitLabel || "卡";
              const priceUnit = supply.priceUnit.replace("GPU", "卡");
              const billing = priceUnit ? `/ ${priceUnit}` : supply.pricingMode === "perpetual" && supply.unitPriceMinor !== undefined ? `/ ${unit} · 买断` : supply.billingMode;
              return <article className={styles.offer} key={supply.id}>
                <Link href={`/market/${encodeURIComponent(supply.id)}`} className={styles.offerLink}>
                  <div className={styles.offerHeading}><h4>{supply.gpuModel || supply.name}</h4><span className={styles.matchScore}>匹配分 {match.score}</span></div>
                  <p className={styles.offerMeta}>{supply.region || "地域待确认"} · {supply.deliveryMode} · 可售 {supply.availableUnits} {unit}</p>
                  <div className={styles.offerFooter}><div className={styles.offerPrice}><strong>{supply.unitPrice}</strong><span>{billing}</span></div><span className={styles.offerAction}>查看商品 ↗</span></div>
                </Link>
                {match.reasons.length ? <details className={styles.reasons}><summary>为什么匹配</summary><ul>{match.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></details> : null}
              </article>;
            }) : <div className={styles.noMatches}><p>{result.note || "当前没有符合条件的在售商品，可以调整预算、地域或型号后再评估。"}</p><Link href="/market">查看算力市场 ↗</Link></div>}
          </div>
        </details>
      </section>
    </div>

    {estimate.basis || result.analysis_steps.length ? <details className={styles.analysis}><summary>评估依据</summary>{estimate.basis ? <p className={styles.basis}>{estimate.basis}</p> : null}<ol>{result.analysis_steps.map((step, index) => <li key={index}><strong>{step.title}</strong><p>{step.detail}</p></li>)}</ol></details> : null}
  </div>;
}
