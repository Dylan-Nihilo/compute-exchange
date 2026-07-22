"use client";

import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import Image from "next/image";

import {NetworkBackground} from "./network-background";

/**
 * Ecosystem network section (Figma frame 385:2 "03 / Network", 1440x867 —
 * adds the 链上存证 on-chain attestation node to the original 373:586 layout).
 * Desktop renders the Figma absolute layout inside a 16:9 canvas sized
 * with container query units so every node scales with the canvas;
 * mobile falls back to a stacked hub + grid over the same motion glow.
 *
 * Motion: the title rises out of a mask, the hub pops in first and the
 * satellites stagger-pop around it, then every node settles into a slow
 * phase-offset float. Satellite hover lifts the badge. All motion is
 * disabled or instant under reduced motion.
 */

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const SATELLITES = [
  {
    key: "token",
    title: "Token服务",
    subtitle: "模型/API/推理",
    icon: "/compute-spot/network-token.svg",
    position: "left-[28.1%] top-[20.9%]",
  },
  {
    key: "enterprise",
    title: "企业需求",
    subtitle: "研发/推理/训练",
    icon: "/compute-spot/network-enterprise.svg",
    position: "left-[6%] top-[51.6%]",
  },
  {
    key: "compliance",
    title: "合规机构",
    subtitle: "资源/交付/运营",
    icon: "/compute-spot/network-compliance.svg",
    position: "left-[73.4%] top-[42.2%]",
  },
  {
    key: "finance",
    title: "金融与设备",
    subtitle: "租赁/工程/资产",
    icon: "/compute-spot/network-finance.svg",
    position: "left-[60.2%] top-[78.6%]",
  },
  {
    key: "attestation",
    title: "链上存证",
    subtitle: "确权/溯源/防篡改",
    icon: "/compute-spot/network-attestation.svg",
    position: "left-[22.3%] top-[78.6%]",
  },
] as const;

type Satellite = (typeof SATELLITES)[number];

const titleMask: Variants = {hidden: {}, show: {}};
const titleReveal: Variants = {hidden: {y: "110%"}, show: {y: "0%"}};

const canvasStagger: Variants = {
  hidden: {},
  show: {transition: {staggerChildren: 0.1, delayChildren: 0.3}},
};

const hubPop: Variants = {
  hidden: {opacity: 0, scale: 0.7},
  show: {opacity: 1, scale: 1},
};

const satellitePop: Variants = {
  hidden: {opacity: 0, scale: 0.5, y: 16},
  show: {opacity: 1, scale: 1, y: 0},
};

const mobileStagger: Variants = {
  hidden: {},
  show: {transition: {staggerChildren: 0.07}},
};

const mobileRise: Variants = {
  hidden: {opacity: 0, y: 18},
  show: {opacity: 1, y: 0},
};

function SatelliteBadge({icon, sizeClass}: {icon: string; sizeClass: string}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border border-[#d9e3ef] bg-[radial-gradient(circle_at_43%_37%,#ffffff_25%,#e7edf4_100%)] transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:border-[#a8c4de] group-hover:shadow-[0_10px_24px_-8px_rgba(7,56,94,0.35)] group-hover:duration-200 ${sizeClass}`}
    >
      <Image src={icon} alt="" width={46} height={46} className="size-3/5" />
    </span>
  );
}

function DesktopSatellite({
  satellite,
  index,
  revealTransition,
  floats,
}: {
  satellite: Satellite;
  index: number;
  revealTransition: Transition;
  floats: boolean;
}) {
  return (
    <motion.div
      variants={satellitePop}
      transition={revealTransition}
      whileHover={{
        scale: 1.07,
        transition: {type: "spring", stiffness: 300, damping: 22},
      }}
      className={`group absolute ${satellite.position}`}
    >
      <motion.div
        animate={floats ? {y: [0, -6, 0]} : undefined}
        transition={
          floats
            ? {
                duration: 5.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.65,
              }
            : undefined
        }
        className="flex items-center gap-[1.41cqw]"
      >
        <SatelliteBadge icon={satellite.icon} sizeClass="size-[8.55cqw]" />
        <span className="flex flex-col gap-[0.47cqw] whitespace-nowrap text-[#07385e]">
          <span className="text-[1.72cqw] font-medium leading-[1.64cqw]">
            {satellite.title}
          </span>
          <span className="text-[1.09cqw] leading-[1.64cqw]">
            {satellite.subtitle}
          </span>
        </span>
      </motion.div>
    </motion.div>
  );
}

function DesktopCanvas({
  revealTransition,
  floats,
}: {
  revealTransition: Transition;
  floats: boolean;
}) {
  return (
    <motion.div
      variants={canvasStagger}
      initial="hidden"
      whileInView="show"
      viewport={{once: true, margin: "0px 0px -18% 0px"}}
      className="@container relative hidden aspect-[16/9] lg:block"
    >
      <motion.div
        variants={hubPop}
        transition={revealTransition}
        className="absolute left-[41.25%] top-[46.1%] w-[16.9%]"
      >
        <motion.div
          animate={floats ? {y: [0, -5, 0]} : undefined}
          transition={
            floats
              ? {duration: 6, repeat: Infinity, ease: "easeInOut"}
              : undefined
          }
          className="flex flex-col items-center gap-[0.94cqw] text-center text-[#07385e]"
        >
          <Image
            src="/compute-spot/network-center.svg"
            alt=""
            width={60}
            height={60}
            className="size-[4.69cqw]"
          />
          <p className="whitespace-nowrap text-[3.44cqw] font-medium leading-[3.28cqw]">
            撮合中心
          </p>
          <p className="text-[2.19cqw] leading-[1.5]">算力/交付/服务</p>
        </motion.div>
      </motion.div>
      {SATELLITES.map((satellite, index) => (
        <DesktopSatellite
          key={satellite.key}
          satellite={satellite}
          index={index}
          revealTransition={revealTransition}
          floats={floats}
        />
      ))}
    </motion.div>
  );
}

function MobileCanvas({revealTransition}: {revealTransition: Transition}) {
  return (
    <motion.div
      variants={mobileStagger}
      initial="hidden"
      whileInView="show"
      viewport={{once: true, margin: "0px 0px -12% 0px"}}
      className="relative flex flex-col items-center gap-10 px-6 py-12 lg:hidden"
    >
      <motion.div
        variants={mobileRise}
        transition={revealTransition}
        className="flex flex-col items-center gap-2 text-center text-[#07385e]"
      >
        <Image
          src="/compute-spot/network-center.svg"
          alt=""
          width={60}
          height={60}
          className="size-12"
        />
        <p className="text-2xl font-medium">撮合中心</p>
        <p className="text-sm">算力/交付/服务</p>
      </motion.div>
      <ul className="grid w-full max-w-md grid-cols-1 gap-x-8 gap-y-5 min-[26rem]:grid-cols-2">
        {SATELLITES.map((satellite) => (
          <motion.li
            key={satellite.key}
            variants={mobileRise}
            transition={revealTransition}
            className="group flex items-center gap-3"
          >
            <SatelliteBadge icon={satellite.icon} sizeClass="size-12" />
            <span className="flex flex-col gap-0.5 text-[#07385e]">
              <span className="text-sm font-medium">{satellite.title}</span>
              <span className="text-xs">{satellite.subtitle}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

export function NetworkSection() {
  const prefersReducedMotion = useReducedMotion();
  const revealTransition = prefersReducedMotion
    ? {duration: 0}
    : {duration: 0.6, ease: EASE_OUT_EXPO};
  const floats = !prefersReducedMotion;

  return (
    <section
      id="network"
      aria-labelledby="network-title"
      className="bg-[#f9f9f9] text-cs-ink"
    >
      <div className="mx-auto w-[calc(100%-3rem)] max-w-[81rem] py-20 lg:w-[90%]">
        <div className="flex min-h-[4.688rem] items-end">
          <motion.h2
            id="network-title"
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
              连接算力，也连接价值
            </motion.span>
          </motion.h2>
        </div>

        <div className="relative mt-[2.375rem] overflow-hidden rounded-[1.25rem]">
          <NetworkBackground />
          <DesktopCanvas revealTransition={revealTransition} floats={floats} />
          <MobileCanvas revealTransition={revealTransition} />
        </div>
      </div>
    </section>
  );
}
