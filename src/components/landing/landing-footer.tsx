"use client";

import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import Link from "next/link";

const footerGroups = [
  {
    label: "平台",
    links: [
      ["算力市场", "/market"],
      ["业务模块", "#modules"],
    ],
  },
  {
    label: "合作",
    links: [
      ["成为伙伴", "/auth/register"],
      ["资源入驻", "/auth/register"],
    ],
  },
  {
    label: "支持",
    links: [
      ["平台网络", "#network"],
      ["合规说明", "#network"],
    ],
  },
  {
    label: "联系",
    links: [
      ["合作与咨询", "/auth/register"],
      ["关于 ComputeSpot", "/"],
    ],
  },
] as const;

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const ctaStagger: Variants = {
  hidden: {},
  show: {transition: {staggerChildren: 0.12}},
};

const titleMask: Variants = {hidden: {}, show: {}};
const titleReveal: Variants = {hidden: {y: "110%"}, show: {y: "0%"}};

const rise: Variants = {
  hidden: {opacity: 0, y: 20},
  show: {opacity: 1, y: 0},
};

const groupCascade: Variants = {
  hidden: {},
  show: {transition: {staggerChildren: 0.08, delayChildren: 0.1}},
};

/**
 * Landing footer: gradient CTA block, link groups and legal bar.
 * The CTA title rises out of a mask, sub copy and button follow, and the
 * link groups cascade in. Footer links nudge right on hover; the CTA
 * button keeps its lift and gains a press-down. One-shot reveals; all
 * motion is instant under reduced motion.
 */
export function LandingFooter() {
  const prefersReducedMotion = useReducedMotion();
  const revealTransition: Transition = prefersReducedMotion
    ? {duration: 0}
    : {duration: 0.7, ease: EASE_OUT_EXPO};

  return (
    <footer
      className="bg-[linear-gradient(143deg,var(--color-cs-footer-start)_40%,var(--color-cs-footer-end)_100%)] text-white"
      aria-labelledby="footer-cta-title"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-[81rem] pb-10 pt-20 lg:pb-11 lg:pt-[6.875rem]">
        <motion.div
          variants={ctaStagger}
          initial="hidden"
          whileInView="show"
          viewport={{once: true, margin: "0px 0px -12% 0px"}}
          className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <motion.h2
              id="footer-cta-title"
              variants={titleMask}
              className="overflow-hidden font-display text-[2.75rem] leading-[1.1] tracking-[-0.045em] sm:text-[3.875rem]"
            >
              <motion.span
                variants={titleReveal}
                transition={revealTransition}
                className="block"
              >
                找到下一块合适的算力
              </motion.span>
            </motion.h2>
            <motion.p
              variants={rise}
              transition={revealTransition}
              className="mt-3 text-sm text-white/70 sm:text-base"
            >
              从需求提交到资源交付，用一套清晰流程完成。
            </motion.p>
          </div>

          <motion.div variants={rise} transition={revealTransition}>
            <Link
              href="/market"
              className="inline-flex h-[3.375rem] w-fit min-w-[11.875rem] items-center justify-center rounded-full bg-cs-footer-action px-7 text-sm font-semibold text-cs-footer-action-ink transition-transform hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              进入算力市场
            </Link>
          </motion.div>
        </motion.div>

        <div className="mt-14 border-t border-white/20 pt-10 lg:mt-14">
          <motion.nav
            aria-label="页脚导航"
            variants={groupCascade}
            initial="hidden"
            whileInView="show"
            viewport={{once: true, margin: "0px 0px -10% 0px"}}
            className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4"
          >
            {footerGroups.map((group) => (
              <motion.div
                key={group.label}
                variants={rise}
                transition={revealTransition}
              >
                <h3 className="text-sm font-semibold text-white">{group.label}</h3>
                <ul className="mt-4 space-y-3">
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="inline-block text-sm text-white/65 transition-[color,transform] duration-200 hover:translate-x-0.5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ComputeSpot. All rights reserved.</p>
          <p>ICP / EDI 资质办理中 · 合规经营服务平台</p>
        </div>
      </div>
    </footer>
  );
}
