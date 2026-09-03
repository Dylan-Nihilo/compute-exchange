"use client";

import {Link, Surface, Typography} from "@heroui/react";
import {MeshGradient} from "@paper-design/shaders-react";
import {AnimatePresence, motion, useReducedMotion} from "motion/react";
import Image from "next/image";
import {usePathname} from "next/navigation";
import {useEffect, useRef} from "react";

const authStages = [
  {
    path: "/auth/login",
    eyebrow: "安全访问",
    title: ["可信算力，", "一站连接"],
    description: "登录后统一管理算力资源、交易订单与业务协作。",
    visual: {
      background: "#edf4f7",
      colors: ["#eaf1f5", "#f8fafb", "#6f9db4", "#cadae2", "#d7e995", "#4e7c93"],
      distortion: 0.76,
      duration: 13,
      frame: 240,
      motion: {
        rotate: [0, 1.2, 0],
        scale: [1, 1.04, 1],
        x: ["-2%", "2%", "-2%"],
        y: ["1%", "-2%", "1%"],
      },
      offsetX: -0.26,
      offsetY: 0.34,
      scale: 0.84,
      speed: 0.16,
      swirl: 0.28,
    },
  },
  {
    path: "/auth/register",
    eyebrow: "建立账户",
    title: ["连接供需，", "建立可信合作"],
    description: "创建平台账户，进入算力采购、资源供给与订单协作流程。",
    visual: {
      background: "#eef5f0",
      colors: ["#edf5ee", "#fbfaf5", "#78a68e", "#cfe1d5", "#efcb8a", "#6e9a80"],
      distortion: 0.68,
      duration: 10,
      frame: 164,
      motion: {
        rotate: [-1.2, 1.2, -1.2],
        scale: [1.05, 1, 1.05],
        x: ["-3%", "3%", "-3%"],
        y: ["4%", "-3%", "4%"],
      },
      offsetX: -0.1,
      offsetY: 0.18,
      scale: 0.9,
      speed: 0.2,
      swirl: 0.18,
    },
  },
  {
    path: "/auth/verify",
    eyebrow: "账户认证",
    title: ["确认主体，", "开启可信交易"],
    description: "完成个人或企业主体信息确认，建立可信账户身份。",
    visual: {
      background: "#edf4f3",
      colors: ["#ebf3f2", "#f9fbfa", "#60a3a5", "#c6ded9", "#a8cdbd", "#457c83"],
      distortion: 0.82,
      duration: 9,
      frame: 210,
      motion: {
        rotate: [-1.5, 1.5, -1.5],
        scale: [0.96, 1.08, 0.96],
        x: ["0%", "1%", "0%"],
        y: ["2%", "-1%", "2%"],
      },
      offsetX: -0.34,
      offsetY: 0.3,
      scale: 0.78,
      speed: 0.12,
      swirl: 0.42,
    },
  },
  {
    path: "/supplier/apply",
    eyebrow: "供给方入驻",
    title: ["发布资源，", "连接算力需求"],
    description: "提交机房与经营资质，申请开通供给方工作台。",
    visual: {
      background: "#f4f0e9",
      colors: ["#f5f0e9", "#fbfaf7", "#b68762", "#dfcdb9", "#bdc9a2", "#728a9b"],
      distortion: 0.58,
      duration: 12,
      frame: 136,
      motion: {
        rotate: [0, 2, 0],
        scale: [1.03, 1, 1.03],
        x: ["-5%", "4%", "-5%"],
        y: ["-1%", "2%", "-1%"],
      },
      offsetX: 0.08,
      offsetY: 0.28,
      scale: 0.92,
      speed: 0.14,
      swirl: 0.12,
    },
  },
];

const motionEase = [0.22, 1, 0.36, 1] as const;

export function AuthFrame({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const stageIndex = Math.max(
    0,
    authStages.findIndex(({path}) => path === pathname),
  );
  const stage = authStages[stageIndex];
  const isEntryRoute = stageIndex < 2;
  const isLongFormRoute =
    stage.path === "/auth/verify" || stage.path === "/supplier/apply";
  const shouldReduceMotion = useReducedMotion();
  const previousStageIndex = useRef(stageIndex);
  const contentPanel = useRef<HTMLElement>(null);
  const direction = stageIndex >= previousStageIndex.current ? 1 : -1;
  const routeDuration = shouldReduceMotion ? 0.14 : 0.42;

  useEffect(() => {
    previousStageIndex.current = stageIndex;
    contentPanel.current?.scrollTo({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      top: 0,
    });
  }, [pathname, shouldReduceMotion, stageIndex]);

  return (
    <main className="omnis-auth-controls relative flex min-h-svh items-center overflow-hidden bg-[#edf3f6] p-0 text-[#0b263a] sm:p-5 lg:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.9),transparent_28%),radial-gradient(circle_at_84%_86%,rgba(190,213,225,0.34),transparent_34%)]"
      />
      <Surface
        className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1240px] overflow-hidden rounded-none bg-[#fbfcfd] shadow-[0_28px_80px_rgba(36,71,109,0.13)] sm:min-h-[calc(100svh-2.5rem)] sm:rounded-[28px] lg:h-[calc(100svh-4rem)] lg:max-h-[760px] lg:min-h-0 lg:grid-cols-[44%_56%]"
        variant="default"
      >
        <section className="relative hidden overflow-hidden bg-[#edf4f7] px-12 text-[#173d52] lg:block">
          <AnimatePresence initial={false}>
            <motion.div
              animate={{opacity: 1}}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              exit={{opacity: 0}}
              initial={{opacity: 0}}
              key={stage.path}
              style={{backgroundColor: stage.visual.background}}
              transition={{
                duration: shouldReduceMotion ? 0.14 : 0.62,
                ease: motionEase,
              }}
            >
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  WebkitMaskImage:
                    "radial-gradient(ellipse 92% 72% at 12% 92%, #000 0%, rgba(0, 0, 0, 0.94) 46%, transparent 100%)",
                  maskImage:
                    "radial-gradient(ellipse 92% 72% at 12% 92%, #000 0%, rgba(0, 0, 0, 0.94) 46%, transparent 100%)",
                }}
              >
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? {rotate: 0, scale: 1, x: 0, y: 0}
                      : stage.visual.motion
                  }
                  className="absolute -inset-[8%]"
                  transition={
                    shouldReduceMotion
                      ? {duration: 0}
                      : {
                          duration: stage.visual.duration,
                          ease: [0.65, 0, 0.35, 1],
                          repeat: Infinity,
                        }
                  }
                >
                  <MeshGradient
                    className="size-full"
                    colors={stage.visual.colors}
                    distortion={stage.visual.distortion}
                    frame={stage.visual.frame}
                    grainMixer={0.06}
                    grainOverlay={0.015}
                    height="100%"
                    maxPixelCount={320_000}
                    minPixelRatio={1}
                    offsetX={stage.visual.offsetX}
                    offsetY={stage.visual.offsetY}
                    scale={stage.visual.scale}
                    speed={shouldReduceMotion ? 0 : stage.visual.speed}
                    swirl={stage.visual.swirl}
                    width="100%"
                  />
                </motion.div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,251,251,0.64)_0%,rgba(248,251,251,0.08)_48%,rgba(248,251,251,0.12)_100%)]" />
              </div>
            </motion.div>
          </AnimatePresence>

          <Link className="absolute left-12 top-12 no-underline" href="/">
            <Image
              alt="万象硅芯 OmniS"
              className="h-auto w-[210px]"
              height={55}
              priority
              src="/brand/omnis/OmniS-logo-horizontal-blue.svg"
              width={195}
            />
          </Link>

          <div className="absolute left-12 right-12 top-[176px] max-w-[390px]">
            <AnimatePresence custom={direction} mode="popLayout">
              <motion.div
                animate={{opacity: 1, x: 0}}
                custom={direction}
                exit={{
                  opacity: 0,
                  x: shouldReduceMotion ? 0 : direction * -18,
                }}
                initial={{
                  opacity: 0,
                  x: shouldReduceMotion ? 0 : direction * 24,
                }}
                key={stage.path}
                transition={{duration: routeDuration, ease: motionEase}}
              >
                <Typography
                  className="mb-4 text-xs font-semibold tracking-[0.14em] text-[#648397]"
                  type="body-xs"
                >
                  {stage.eyebrow}
                </Typography>
                <Typography
                  className="text-[34px] leading-[1.22] tracking-[-0.035em] text-[#173d52]"
                  type="h1"
                >
                  {stage.title[0]}
                  <br />
                  {stage.title[1]}
                </Typography>
                <Typography
                  className="mt-5 max-w-[360px] text-[15px] leading-7 text-[#587487]"
                  type="body-sm"
                >
                  {stage.description}
                </Typography>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section
          className={`flex min-w-0 flex-col px-5 pb-12 pt-7 sm:px-10 lg:h-full lg:min-h-0 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:px-16 ${isLongFormRoute ? "lg:pb-6 lg:pt-12" : "lg:pb-16 lg:pt-[136px]"}`}
          id="auth-content-panel"
          ref={contentPanel}
        >
          <Link className="w-fit no-underline lg:hidden" href="/">
            <Image
              alt="万象硅芯 OmniS"
              className="h-auto w-[156px]"
              height={55}
              priority
              src="/brand/omnis/OmniS-logo-horizontal-blue.svg"
              width={195}
            />
          </Link>
          <motion.div
            layout={shouldReduceMotion ? false : "position"}
            className={`relative mx-auto mt-14 flex min-w-0 w-full flex-1 flex-col lg:mt-0 ${isEntryRoute ? "max-w-[434px]" : "max-w-xl"}`}
            transition={{duration: routeDuration, ease: motionEase}}
          >
            <AnimatePresence custom={direction} mode="popLayout">
              <motion.div
                animate={{opacity: 1, x: 0, scale: 1}}
                className="auth-route-content flex flex-1 flex-col"
                custom={direction}
                exit={{
                  opacity: 0,
                  scale: shouldReduceMotion ? 1 : 0.992,
                  x: shouldReduceMotion ? 0 : direction * -22,
                }}
                initial={{
                  opacity: 0,
                  scale: shouldReduceMotion ? 1 : 0.992,
                  x: shouldReduceMotion ? 0 : direction * 28,
                }}
                key={pathname}
                transition={{duration: routeDuration, ease: motionEase}}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </section>
      </Surface>
    </main>
  );
}
