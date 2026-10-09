"use client";

import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import Image from "next/image";

const PARTNERS = [
  {
    name: "江苏大京投资控股集团有限公司",
    dark: false,
    logo: {src: "/brand/partners/dajing.png", width: 196, height: 57, className: "w-[76%] max-w-40"},
  },
  {
    name: "郑州合盈数据有限责任公司",
    dark: true,
    logo: {src: "/brand/partners/hoyinn.png", width: 215, height: 64, className: "w-[76%] max-w-40"},
  },
  {
    name: "阿里云计算有限公司",
    dark: false,
    logo: {src: "/brand/partners/aliyun.svg", width: 4608, height: 1024, className: "w-[76%] max-w-40"},
  },
  {
    name: "世纪丝路融资租赁（天津）有限公司",
    dark: true,
    logo: {src: "/brand/partners/century-silk-road-dark.png", width: 1213, height: 1297, className: "h-[145%] w-auto shrink-0"},
  },
  {
    name: "天开高教科创园",
    dark: false,
    logo: {src: "/brand/partners/tiankai.png", width: 750, height: 509, className: "h-[92%] w-auto max-w-full"},
  },
  {
    name: "联合绿能新能源科技（天津）有限公司",
    dark: true,
    logo: {src: "/brand/partners/united-green-energy-dark.png", width: 1225, height: 1284, className: "h-[145%] w-auto shrink-0"},
  },
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
  hidden: {opacity: 0, y: 20},
  show: {opacity: 1, y: 0},
};

function PartnerTile({
  partner,
  revealTransition,
}: {
  partner: Partner;
  revealTransition: Transition;
}) {
  return (
    <motion.li
      variants={tilePop}
      transition={revealTransition}
      className="min-w-0"
    >
      <div
        data-partner-logo
        className={`flex aspect-[113/44] items-center justify-center overflow-hidden rounded-xl border border-cs-divider/70 ${partner.dark ? "bg-black" : "bg-white"}`}
      >
        <Image
          src={partner.logo.src}
          alt={partner.name}
          width={partner.logo.width}
          height={partner.logo.height}
          unoptimized
          className={`pointer-events-none select-none object-contain ${partner.logo.className}`}
        />
      </div>
    </motion.li>
  );
}

/**
 * Only confirmed partner logos are displayed;
 * source details live in docs/partners.md.
 */
export function PartnersSection() {
  const prefersReducedMotion = useReducedMotion();
  const revealTransition: Transition = prefersReducedMotion
    ? {duration: 0}
    : {duration: 0.7, ease: EASE_OUT_EXPO};

  return (
    <section
      id="partners"
      aria-labelledby="partners-title"
      className="bg-surface text-foreground"
    >
      <div className="mx-auto grid w-[calc(100%-3rem)] max-w-[81rem] gap-12 py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14 lg:py-28 xl:gap-20">
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
            连接云服务、数据中心与产业伙伴，形成可持续的算力供应链。
          </motion.p>
        </motion.div>

        <motion.ul
          variants={tileGrid}
          initial="hidden"
          whileInView="show"
          viewport={{once: true, margin: "0px 0px -10% 0px"}}
          className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6"
        >
          {PARTNERS.map((partner) => (
            <PartnerTile
              key={partner.name}
              partner={partner}
              revealTransition={revealTransition}
            />
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
