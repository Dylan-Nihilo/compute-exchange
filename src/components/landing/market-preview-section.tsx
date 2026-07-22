"use client";

import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import Link from "next/link";

const marketTabs = [
  {label: "全部资源", href: "/market", active: true},
  {label: "NVIDIA H100", href: "/market?q=H100", active: false},
  {label: "NVIDIA A100", href: "/market?q=A100", active: false},
  {label: "L40S", href: "/market?q=L40S", active: false},
] as const;

const filterGroups = [
  {
    label: "GPU 型号",
    options: [
      ["H100", "18"],
      ["A100", "16"],
      ["H200", "8"],
    ],
  },
  {
    label: "地域",
    options: [
      ["华东", "20"],
      ["华南", "11"],
      ["华北", "8"],
    ],
  },
  {
    label: "计费",
    options: [
      ["按小时", "24"],
      ["按月", "12"],
    ],
  },
] as const;

const supplies = [
  {
    name: "NVIDIA H100 SXM 80GB",
    detail: "8 × GPU · 上海 · 稳定交付",
    region: "上海",
    status: "现货",
    billing: "¥25 / 小时",
    query: "H100",
  },
  {
    name: "NVIDIA A100 SXM 80GB",
    detail: "4 × GPU · 深圳 · 可按月",
    region: "深圳",
    status: "现货",
    billing: "¥18 / 小时",
    query: "A100",
  },
  {
    name: "NVIDIA H200 SXM 141GB",
    detail: "8 × GPU · 杭州 · 高带宽",
    region: "杭州",
    status: "即将释放",
    billing: "¥42 / 小时",
    query: "H200",
  },
  {
    name: "NVIDIA L40S 48GB",
    detail: "4 × GPU · 北京 · 适合推理",
    region: "北京",
    status: "现货",
    billing: "¥12 / 小时",
    query: "L40S",
  },
] as const;

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const titleMask: Variants = {hidden: {}, show: {}};
const titleReveal: Variants = {hidden: {y: "110%"}, show: {y: "0%"}};

const panelReveal: Variants = {
  hidden: {opacity: 0, y: 40},
  show: {opacity: 1, y: 0},
};

const rowCascade: Variants = {
  hidden: {},
  show: {transition: {staggerChildren: 0.06, delayChildren: 0.25}},
};

const rowReveal: Variants = {
  hidden: {opacity: 0, y: 12},
  show: {opacity: 1, y: 0},
};

/**
 * Market preview panel (Figma frame "找到适合你的算力").
 * Title rises out of a mask, the panel lifts in, and table rows cascade
 * one by one. Row hover gets a quiet surface tint — the only always-on
 * interaction this data-dense block needs. One-shot reveals; all motion
 * is instant under reduced motion.
 */
export function MarketPreviewSection() {
  const prefersReducedMotion = useReducedMotion();
  const revealTransition: Transition = prefersReducedMotion
    ? {duration: 0}
    : {duration: 0.7, ease: EASE_OUT_EXPO};

  return (
    <section
      id="market-preview"
      aria-labelledby="market-preview-title"
      className="scroll-mt-28 bg-background text-foreground"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-[81rem] py-20 lg:py-[6.875rem]">
        <motion.h2
          id="market-preview-title"
          variants={titleMask}
          initial="hidden"
          whileInView="show"
          viewport={{once: true, margin: "0px 0px -12% 0px"}}
          className="overflow-hidden font-display text-[2.375rem] leading-[1.15] tracking-[-0.04em] sm:text-[2.875rem]"
        >
          <motion.span
            variants={titleReveal}
            transition={revealTransition}
            className="block"
          >
            找到适合你的算力
          </motion.span>
        </motion.h2>

        <motion.div
          variants={panelReveal}
          initial="hidden"
          whileInView="show"
          viewport={{once: true, margin: "0px 0px -8% 0px"}}
          transition={revealTransition}
          className="mt-12 rounded-[1.75rem] border border-border bg-surface p-4 sm:mt-16 sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <nav aria-label="算力资源类型" className="overflow-x-auto pb-1 lg:pb-0">
              <ul className="flex min-w-max gap-2.5">
                {marketTabs.map((tab) => (
                  <li key={tab.label}>
                    <Link
                      href={tab.href}
                      aria-current={tab.active ? "page" : undefined}
                      className={`inline-flex h-[2.625rem] items-center rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                        tab.active
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface-secondary text-muted hover:bg-surface-tertiary hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <Link
              href="/market"
              className="inline-flex h-[2.625rem] w-fit items-center justify-center rounded-full bg-cs-accent px-6 text-sm font-semibold text-cs-accent-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              查看全部
            </Link>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[14.75rem_minmax(0,1fr)]">
            <aside
              aria-label="市场资源概览"
              className="min-w-0 overflow-x-auto rounded-[1.25rem] bg-surface-secondary"
            >
              <div className="grid min-w-[38rem] grid-cols-3 gap-6 p-5 lg:min-w-0 lg:grid-cols-1 lg:gap-0 lg:p-0">
                {filterGroups.map((group, index) => (
                  <div
                    key={group.label}
                    className={`lg:px-5 lg:py-[1.125rem] ${
                      index > 0 ? "lg:border-t lg:border-separator" : ""
                    }`}
                  >
                    <h3 className="text-xs font-semibold tracking-[0.08em] text-muted">
                      {group.label}
                    </h3>
                    <ul className="mt-3 space-y-2.5">
                      {group.options.map(([label, count]) => (
                        <li
                          key={label}
                          className="flex items-center justify-between gap-4 text-sm"
                        >
                          <span>{label}</span>
                          <span className="text-muted">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </aside>

            <div className="min-w-0 overflow-x-auto rounded-[1.25rem] border border-border bg-surface">
              <table className="w-full min-w-[47rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-separator text-[0.6875rem] font-semibold tracking-[0.08em] text-muted">
                    <th scope="col" className="px-5 py-[1.125rem]">
                      GPU 资源
                    </th>
                    <th scope="col" className="px-4 py-[1.125rem]">
                      地域
                    </th>
                    <th scope="col" className="px-4 py-[1.125rem]">
                      资源状态
                    </th>
                    <th scope="col" className="px-4 py-[1.125rem]">
                      计费方式
                    </th>
                    <th scope="col" className="px-5 py-[1.125rem]">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={rowCascade}
                  initial="hidden"
                  whileInView="show"
                  viewport={{once: true, margin: "0px 0px -10% 0px"}}
                >
                  {supplies.map((supply) => (
                    <motion.tr
                      key={supply.name}
                      variants={rowReveal}
                      transition={revealTransition}
                      className="border-b border-separator transition-colors duration-200 last:border-b-0 hover:bg-surface-secondary"
                    >
                      <td className="px-5 py-[1.35rem]">
                        <p className="font-semibold tracking-[-0.01em]">
                          {supply.name}
                        </p>
                        <p className="mt-1 text-xs text-muted">{supply.detail}</p>
                      </td>
                      <td className="px-4 py-[1.35rem] text-sm">{supply.region}</td>
                      <td className="px-4 py-[1.35rem]">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            supply.status === "现货"
                              ? "bg-success-soft text-success-soft-foreground"
                              : "bg-warning-soft text-warning-soft-foreground"
                          }`}
                        >
                          {supply.status}
                        </span>
                      </td>
                      <td className="px-4 py-[1.35rem] text-sm font-medium">
                        {supply.billing}
                      </td>
                      <td className="px-5 py-[1.35rem] text-right">
                        <Link
                          href={`/market?q=${supply.query}`}
                          aria-label={`查看 ${supply.name} 详情`}
                          className="text-sm font-medium text-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                          查看详情
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
