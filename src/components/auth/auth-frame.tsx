"use client";

import {Link, Surface, Typography} from "@heroui/react";
import {MeshGradient} from "@paper-design/shaders-react";
import {useReducedMotion} from "motion/react";
import Image from "next/image";
import {usePathname} from "next/navigation";

export function AuthFrame({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const isEntryRoute = pathname === "/auth/login" || pathname === "/auth/register";
  const isRegister = pathname === "/auth/register";
  const shouldReduceMotion = useReducedMotion();

  return (
    <main className="omnis-auth-controls relative flex min-h-svh items-center overflow-hidden bg-[#edf3f6] p-0 text-[#0b263a] sm:p-5 lg:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.9),transparent_28%),radial-gradient(circle_at_84%_86%,rgba(190,213,225,0.34),transparent_34%)]"
      />
      <Surface
        className="relative z-10 mx-auto grid min-h-svh w-full max-w-[1240px] overflow-hidden rounded-none bg-[#fbfcfd] shadow-[0_28px_80px_rgba(36,71,109,0.13)] sm:min-h-[calc(100svh-2.5rem)] sm:rounded-[28px] lg:min-h-[760px] lg:grid-cols-[44%_56%]"
        variant="default"
      >
        <section className="relative hidden overflow-hidden bg-[#edf4f7] px-12 text-[#173d52] lg:block">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              WebkitMaskImage:
                "radial-gradient(ellipse 92% 72% at 12% 92%, #000 0%, rgba(0, 0, 0, 0.94) 46%, transparent 100%)",
              maskImage:
                "radial-gradient(ellipse 92% 72% at 12% 92%, #000 0%, rgba(0, 0, 0, 0.94) 46%, transparent 100%)",
            }}
          >
            <MeshGradient
              className="size-full"
              colors={["#edf4f7", "#f8fafb", "#88afc2", "#cddfe7", "#d8f09b", "#5f91aa"]}
              distortion={0.76}
              frame={240}
              grainMixer={0.06}
              grainOverlay={0.015}
              height="100%"
              maxPixelCount={320_000}
              minPixelRatio={1}
              offsetX={-0.26}
              offsetY={0.34}
              scale={0.84}
              speed={shouldReduceMotion ? 0 : 0.16}
              swirl={0.28}
              width="100%"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(237,244,247,0.58)_0%,rgba(237,244,247,0.08)_48%,rgba(237,244,247,0.12)_100%)]" />
          </div>

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
            <Typography className="text-[34px] leading-[1.22] tracking-[-0.035em] text-[#173d52]" type="h1">
              {isRegister ? (
                <>
                  连接供需，<br />建立可信合作
                </>
              ) : (
                <>
                  可信算力，<br />一站连接
                </>
              )}
            </Typography>
            <Typography className="mt-5 max-w-[360px] text-[15px] leading-7 text-[#587487]" type="body-sm">
              {isRegister
                ? "创建平台账户，进入算力采购、资源供给与订单协作流程。"
                : "登录后统一管理算力资源、交易订单与业务协作。"}
            </Typography>
          </div>
        </section>

        <section className="flex min-w-0 flex-col px-5 pb-12 pt-7 sm:px-10 lg:min-h-[760px] lg:px-16 lg:pb-16 lg:pt-[136px]">
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
          <div
            className={`mx-auto mt-14 min-w-0 w-full lg:mt-0 ${isEntryRoute ? "max-w-[434px]" : "max-w-xl"}`}
          >
            {children}
          </div>
        </section>
      </Surface>
    </main>
  );
}
