import Link from "next/link";

import type {AgentSearchResult} from "@/lib/agent-search";
import {mapComputeProduct} from "@/lib/market-api";

import styles from "./compute-advisor.module.css";

const number = new Intl.NumberFormat("zh-CN", {maximumFractionDigits: 1});

export function AssessmentResult({result}: {result: AgentSearchResult}) {
  if (!result.relevant) return <div className={styles.rejection}><h3>再聊聊你的算力需求</h3><p>{result.reject_reason || "请描述需要运行的模型、应用或计算任务。"}</p></div>;
  const estimate = result.compute_estimate;
  return <div className={styles.result}>
    <h3 className={styles.conclusion}>{result.summary || "根据你的需求，可以从以下配置开始考虑。"}</h3>
    <dl className={styles.estimates}>
      {[["预计总显存", estimate.total_vram_gb, "GB"], ["参考单卡显存", estimate.per_card_vram_gb, "GB"], ["起步卡数", estimate.min_cards, "卡"]].map(([label, value, unit]) => <div key={String(label)}><dt>{label}</dt><dd>{Number(value) > 0 ? <>{number.format(Number(value))}<span>{unit}</span></> : "待明确"}</dd></div>)}
    </dl>
    {estimate.basis ? <p className={styles.basis}>{estimate.basis}</p> : null}

    {result.machine_plans.length ? <section className={styles.resultSection} aria-label="建议机器方案">
      <div className={styles.sectionLabel}><h4>建议配置</h4><span>{result.machine_plans.length} 个可行方案</span></div>
      <div className={styles.plans}>
        {result.machine_plans.map((plan, index) => <article className={styles.plan} key={`${index}-${plan.gpu_model}`}>
          <p className={styles.planName}><span>0{index + 1}</span>{plan.name || `方案 ${index + 1}`}</p>
          <h5>{plan.gpu_model}</h5>
          <p className={styles.planSpecs}>{plan.cards} 卡 · {plan.nodes} 台{plan.per_card_vram_gb > 0 ? ` · 单卡 ${number.format(plan.per_card_vram_gb)} GB` : ""}</p>
          <p className={styles.planNote}>{plan.note}</p>
        </article>)}
      </div>
      <p className={styles.caption}>配置建议供选型参考，具体可售规格与价格以下方商品为准。</p>
    </section> : null}

    <section className={styles.resultSection} aria-label="平台在售商品">
      <div className={styles.sectionLabel}><h4>平台在售</h4><span>{result.matches.length} 个匹配商品</span></div>
      {result.matches.length ? <div className={styles.offers}>
        {result.matches.map((match) => {
          const supply = mapComputeProduct(match.product);
          const unit = supply.unitLabel === "GPU" ? "卡" : supply.unitLabel || "卡";
          const priceUnit = supply.priceUnit.replace("GPU", "卡");
          return <article className={styles.offer} key={supply.id}>
            <Link href={`/market/${encodeURIComponent(supply.id)}`} className={styles.offerLink}>
              <div><span className={styles.offerMeta}>{supply.region || "地域待确认"} · 可售 {supply.availableUnits} {unit}</span><h5>{supply.gpuModel || supply.name}</h5><p>{supply.deliveryMode} · 匹配分 {match.score}</p></div>
              <div className={styles.offerPrice}><strong>{supply.unitPrice}</strong><span>{priceUnit ? `/ ${priceUnit}` : supply.pricingMode === "perpetual" && supply.unitPriceMinor !== undefined ? `/ ${unit} · 买断` : supply.billingMode}</span><span className={styles.offerAction}>查看商品 ↗</span></div>
            </Link>
            {match.reasons.length ? <details className={styles.reasons}><summary>为什么匹配</summary><ul>{match.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></details> : null}
          </article>;
        })}
      </div> : <div className={styles.noMatches}><p>{result.note || "当前没有符合条件的在售商品，可以调整预算、地域或型号后再评估。"}</p><Link href="/market">查看算力市场 ↗</Link></div>}
    </section>

    {result.analysis_steps.length ? <details className={styles.analysis}><summary>查看评估依据</summary><ol>{result.analysis_steps.map((step, index) => <li key={index}><strong>{step.title}</strong><p>{step.detail}</p></li>)}</ol></details> : null}
  </div>;
}
