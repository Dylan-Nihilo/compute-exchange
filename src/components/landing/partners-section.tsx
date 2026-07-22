"use client";

import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from "motion/react";
import Image from "next/image";

const PARTNERS = [
  {name: "Grow", position: "left-[3.1%] top-[-58%]"},
  {name: "Harbour Studio", position: "left-[-88.1%] top-[-61.4%]"},
  {name: "EventRise", position: "left-[-186.7%] top-[-255.7%]"},
  {name: "wised", position: "left-[3.1%] top-[-448.9%]"},
  {name: "Prismis", position: "left-[-88.1%] top-[-258%]"},
  {
    name: "Magic Media Productions",
    position: "left-[-186.7%] top-[-448.9%]",
  },
  {name: "depove", position: "left-[3.1%] top-[-634.1%]"},
  {name: "Opal", position: "left-[-88.1%] top-[-453.4%]"},
  {name: "roctop", position: "left-[-186.7%] top-[-636.4%]"},
] as const;

type Partner = (typeof PARTNERS)[number];

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const copyStagger: Variants = {
  hidden: {},
  show: {transition: {staggerChildren: 0.12}},
};

const titleLine: Variants = {hidden: {y: "110%"}, show: {y: "0%"}};

const copyRise: Variants = {
  hidden: {opacity: 0, y: 20},
  show: {opacity: 1, y: 0},
};

const tileGrid: Variants = {
  hidden: {},
  show: {transition: {staggerChildren: 0.06, delayChildren: 0.15}},
};

const tilePop: Variants = {
  hidden: {opacity: 0, y: 24, scale: 0.92},
  show: {opacity: 1, y: 0, scale: 1},
};

function PartnerTile({
  partner,
  revealTransition,
  hoverLift,
}: {
  partner: Partner;
  revealTransition: Transition;
  hoverLift?: TargetAndTransition;
}) {
  return (
    <motion.li
      variants={tilePop}
      transition={revealTransition}
      whileHover={hoverLift}
      className="relative aspect-[113/44] overflow-hidden rounded-[1.125rem] border border-border bg-black transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[#a8c4de] hover:shadow-[0_16px_36px_-12px_rgba(7,56,94,0.3)] hover:duration-200"
    >
      <Image
        src="/compute-spot/partners-demo.png"
        alt={partner.name}
        width={658}
        height={877}
        unoptimized
        className={`pointer-events-none absolute h-[996.6%] w-[291.2%] max-w-none select-none ${partner.position}`}
      />
    </motion.li>
  );
}

/**
 * Partner logo wall (Figma frame "04 / Partners and compliance").
 * Copy lines rise out of masks in sequence, then the 3x3 logo tiles
 * cascade in. Standard hover: the tile lifts on a spring with border and
 * shadow emphasis. The logo sprite is served unoptimized so the optimizer
 * never upscales or recompresses it. One-shot reveals; all motion is
 * instant or disabled under reduced motion.
 */
export function PartnersSection() {
  const prefersReducedMotion = useReducedMotion();
  const revealTransition: Transition = prefersReducedMotion
    ? {duration: 0}
    : {duration: 0.7, ease: EASE_OUT_EXPO};
  const hoverLift = prefersReducedMotion
    ? undefined
    : ({
        y: -4,
        transition: {type: "spring", stiffness: 300, damping: 22},
      } as const);

  return (
    <section
      id="partners"
      aria-labelledby="partners-title"
      className="bg-surface text-foreground"
    >
      <div className="mx-auto grid w-[calc(100%-3rem)] max-w-[81rem] gap-12 py-20 lg:grid-cols-[30rem_minmax(0,1fr)] lg:gap-[5.625rem] lg:py-28">
        <motion.div
          variants={copyStagger}
          initial="hidden"
          whileInView="show"
          viewport={{once: true, margin: "0px 0px -12% 0px"}}
        >
          <h2
            id="partners-title"
            className="text-[clamp(2.5rem,3.2vw,2.875rem)] leading-[1.12] font-medium tracking-[-0.055em]"
          >
            {["与可靠伙伴，", "共同交付"].map((line) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  variants={titleLine}
                  transition={revealTransition}
                  className="block"
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h2>
          <motion.p
            variants={copyRise}
            transition={revealTransition}
            className="mt-[2.375rem] max-w-[26.25rem] text-[0.9375rem] leading-[1.65] text-muted"
          >
            连接合规机构、设备厂商、支付与产业服务伙伴，形成可持续的算力供应链。
          </motion.p>
        </motion.div>

        <motion.ul
          variants={tileGrid}
          initial="hidden"
          whileInView="show"
          viewport={{once: true, margin: "0px 0px -10% 0px"}}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6"
        >
          {PARTNERS.map((partner) => (
            <PartnerTile
              key={partner.name}
              partner={partner}
              revealTransition={revealTransition}
              hoverLift={hoverLift}
            />
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
