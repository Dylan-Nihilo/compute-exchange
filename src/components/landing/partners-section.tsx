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
  {
    name: "阿里云计算有限公司",
    brand: "阿里云",
    dark: false,
    logo: {src: "/brand/partners/aliyun.svg", width: 4608, height: 1024, className: "max-h-12 w-[180px]"},
  },
  {
    name: "郑州合盈数据有限责任公司",
    brand: "合盈数据",
    dark: true,
    logo: {src: "/brand/partners/hoyinn.png", width: 215, height: 64, className: "max-h-14 w-[180px]"},
  },
  {
    name: "天河盈科智算（新星市）科技有限公司",
    brand: "天河盈科智算",
    dark: false,
    logo: null,
  },
  {
    name: "京合云（上海）科技发展有限公司",
    brand: "京合云",
    dark: false,
    logo: null,
  },
  {
    name: "江苏大京投资控股集团有限公司",
    brand: "大京集团",
    dark: false,
    logo: {src: "/brand/partners/dajing.png", width: 196, height: 57, className: "max-h-14 w-[180px]"},
  },
  {
    name: "世纪丝路融资租赁（天津）有限公司",
    brand: "世纪丝路融资租赁",
    dark: false,
    logo: {src: "/brand/partners/century-silk-road.png", width: 496, height: 530, className: "h-32 w-auto"},
  },
  {
    name: "天开高教科创园",
    brand: "天开高教科创园",
    dark: false,
    logo: {src: "/brand/partners/tiankai.png", width: 750, height: 509, className: "h-24 w-auto"},
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
      className={`flex min-h-[168px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[1.125rem] border border-cs-divider px-4 py-4 text-center transition-[border-color,box-shadow] duration-300 hover:border-cs-proof-text/40 hover:shadow-sm last:col-span-2 sm:last:col-span-1 sm:last:col-start-2 ${partner.dark ? "bg-cs-proof-title text-white" : "bg-white text-cs-proof-title"}`}
    >
      <div className="flex h-24 w-full items-center justify-center">
        {partner.logo ? (
          <Image
            src={partner.logo.src}
            alt=""
            aria-hidden="true"
            width={partner.logo.width}
            height={partner.logo.height}
            unoptimized
            className={`pointer-events-none max-w-full select-none object-contain ${partner.logo.className}`}
          />
        ) : (
          <span className="text-xl leading-8 font-medium tracking-wide">{partner.brand}</span>
        )}
      </div>
      <p className={`min-h-8 max-w-full text-balance text-[11px] leading-4 ${partner.dark ? "text-white/80" : "text-cs-proof-text"}`}>
        {partner.name}
      </p>
    </motion.li>
  );
}

/**
 * Partner logo wall (Figma frame "04 / Partners and compliance").
 * Original partner assets retain their proportions and colors. Partners
 * without an identified logo use their names. Reveals and hover lifts
 * respect reduced motion; source details live in docs/partners.md.
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
