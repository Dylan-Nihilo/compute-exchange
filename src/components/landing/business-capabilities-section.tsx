"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import {useRef} from "react";

const PRIMARY_CAPABILITIES = [
  {
    title: "算力现货撮合",
    description:
      "合规机构资源，实时比价、撮合与交付，让企业快速获得可用算力。",
    action: "进入算力市场",
    href: "/market",
    image: "/compute-spot/business-market.png",
    featured: true,
  },
  {
    title: "AI Token 工厂",
    description: "为大模型部署、Token 智能服务与推理业务提供稳定算力。",
    action: "查看 Token 服务",
    href: "#network",
    image: "/compute-spot/business-token.png",
  },
] as const;

const SECONDARY_CAPABILITIES = [
  {
    title: "设备整包销售",
    description: "服务器、GPU 与数据中心设备采购。",
    action: "了解更多",
    href: "/auth/register",
    image: "/compute-spot/business-hardware.png",
  },
  {
    title: "组网与机电安装服务",
    description: "机房规划、配电、制冷与工程项目整合。",
    action: "登记项目",
    href: "/auth/register",
    image: "/compute-spot/business-engineering.png",
  },
  {
    title: "融资租赁",
    description: "为持续算力需求提供灵活的资产解决方案。",
    action: "提交需求",
    href: "/auth/register",
    image: "/compute-spot/business-finance.png",
  },
] as const;

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const titleMask: Variants = {
  hidden: {},
  show: {},
};

const titleReveal: Variants = {
  hidden: {y: "110%"},
  show: {y: "0%"},
};

const cardGrid: Variants = {
  hidden: {},
  show: {transition: {staggerChildren: 0.12}},
};

const cardReveal: Variants = {
  hidden: {opacity: 0, y: 64, scale: 0.96},
  show: {opacity: 1, y: 0, scale: 1},
};

type Capability = {
  title: string;
  description: string;
  action: string;
  href: string;
  image: string;
  featured?: boolean;
};

function CapabilityCard({
  capability,
  size,
}: {
  capability: Capability;
  size: "primary" | "secondary";
}) {
  const isPrimary = size === "primary";
  const articleRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Scroll parallax on the card image: the wrapper extends 40px past the
  // card on both ends so the ±32px drift never exposes an edge.
  // Disabled under reduced motion.
  const {scrollYProgress} = useScroll({
    target: articleRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], [32, -32]);
  const revealTransition = prefersReducedMotion
    ? {duration: 0}
    : {duration: 0.8, ease: EASE_OUT_EXPO};

  return (
    <motion.article
      ref={articleRef}
      variants={cardReveal}
      transition={revealTransition}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {y: -4, transition: {duration: 0.25, ease: "easeOut"}}
      }
      className={`group relative overflow-hidden rounded-[1.25rem] border bg-[#f7fafd] transition-shadow duration-300 hover:shadow-[0_24px_48px_-12px_rgba(6,37,59,0.18)] ${
        isPrimary
          ? "h-[15rem] lg:h-[17.5rem]"
          : "h-[11.875rem]"
      } ${
        capability.featured
          ? "border-[#b9d13a]/20 shadow-[0_16px_36px_rgba(6,37,59,0.08)]"
          : "border-[#d6e1e8]/20"
      }`}
    >
      <motion.div
        style={prefersReducedMotion ? undefined : {y: imageY}}
        className="absolute inset-x-0 -inset-y-10 transition-[filter] duration-300 pointer-fine:blur-[4px] group-hover:blur-none group-focus-within:blur-none"
      >
        <Image
          src={capability.image}
          alt=""
          fill
          sizes={isPrimary ? "(min-width: 1024px) 45vw, 90vw" : "(min-width: 1024px) 30vw, 90vw"}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </motion.div>
      <div
        className={`absolute inset-0 ${
          capability.featured ? "bg-[#f7fafd]/34" : "bg-[#f7fafd]/20"
        }`}
      />
      <div
        className={`absolute inset-0 ${
          capability.featured
            ? "bg-[linear-gradient(90deg,rgba(247,250,253,0.98)_0%,rgba(247,250,253,0.9)_34%,rgba(247,250,253,0.38)_55%,rgba(247,250,253,0)_72%)]"
            : "bg-[linear-gradient(90deg,rgba(247,250,253,0.96)_0%,rgba(247,250,253,0.84)_34%,rgba(247,250,253,0.22)_58%,rgba(247,250,253,0)_76%)]"
        }`}
      />

      <div
        className={`absolute inset-0 z-10 flex flex-col items-start px-8 ${
          isPrimary ? "pt-[4.25rem] pb-[3.65rem]" : "pt-[2.25rem] pb-[2.05rem]"
        }`}
      >
        <h3
          className={`font-semibold tracking-[-0.045em] text-[#17201f] ${
            isPrimary ? "text-[1.4375rem]" : "text-lg"
          }`}
        >
          {capability.title}
        </h3>
        <p className="mt-3 max-w-[27rem] text-[0.8125rem] leading-[1.75] text-[#717b76]">
          {capability.description}
        </p>
        <Link
          href={capability.href}
          aria-label={capability.action}
          className="mt-auto inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-[#17201f] outline-none after:absolute after:inset-0 after:content-[''] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-cs-ink/45"
        >
          <span aria-hidden className="relative">
            {Array.from(capability.action).map((char, index) => (
              <span
                key={index}
                style={{animationDelay: `${index * 28}ms`}}
                className="inline-block whitespace-pre motion-safe:group-hover:[animation:cs-char-rise_0.45s_ease-out_both]"
              >
                {char}
              </span>
            ))}
            <span
              className="absolute -bottom-0.5 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-current transition-transform duration-300 ease-out group-hover:scale-x-100"
            />
          </span>
          <span
            aria-hidden
            className="inline-block transition-transform duration-300 ease-out group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>
    </motion.article>
  );
}

/**
 * Business capabilities grid (Figma frame "02 / 业务模块").
 * Scroll choreography: the section title rises out of an overflow mask,
 * then each card row staggers up with a light scale settle, and card images
 * drift with scroll parallax. On hover-capable devices every card image
 * rests in a soft blur (text stays sharp); hovering sharpens the image,
 * lifts the card with a deeper shadow, zooms the image a touch further,
 * draws an underline under the always-visible action link, and slides its
 * arrow right. Keyboard focus-within also sharpens; the link is stretched
 * so the whole card is clickable. One-shot reveals; parallax and motion
 * are disabled under reduced motion.
 */
export function BusinessCapabilitiesSection() {
  const prefersReducedMotion = useReducedMotion();
  const revealTransition = prefersReducedMotion
    ? {duration: 0}
    : {duration: 0.8, ease: EASE_OUT_EXPO};

  return (
    <section id="modules" aria-labelledby="business-capabilities-title" className="bg-white text-cs-ink">
      <div className="mx-auto w-[calc(100%-3rem)] max-w-[81rem] py-20 lg:w-[90%]">
        <div className="flex min-h-[4.688rem] items-end">
          <motion.h2
            id="business-capabilities-title"
            variants={titleMask}
            initial="hidden"
            whileInView="show"
            viewport={{once: true, margin: "0px 0px -12% 0px"}}
            className="overflow-hidden text-[clamp(2rem,3.2vw,2.875rem)] leading-[1.12] font-medium tracking-[-0.055em] text-[#17201f]"
          >
            <motion.span
              variants={titleReveal}
              transition={revealTransition}
              className="block"
            >
              从算力交易，到交付完成
            </motion.span>
          </motion.h2>
        </div>

        <motion.div
          variants={cardGrid}
          initial="hidden"
          whileInView="show"
          viewport={{once: true, margin: "0px 0px -10% 0px"}}
          className="mt-[2.375rem] grid gap-4 lg:grid-cols-2"
        >
          {PRIMARY_CAPABILITIES.map((capability) => (
            <CapabilityCard
              key={capability.title}
              capability={capability}
              size="primary"
            />
          ))}
        </motion.div>

        <motion.div
          variants={cardGrid}
          initial="hidden"
          whileInView="show"
          viewport={{once: true, margin: "0px 0px -10% 0px"}}
          className="mt-3.5 grid gap-4 lg:grid-cols-3"
        >
          {SECONDARY_CAPABILITIES.map((capability) => (
            <CapabilityCard
              key={capability.title}
              capability={capability}
              size="secondary"
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
