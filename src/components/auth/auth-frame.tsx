"use client";

import {Link, Typography} from "@heroui/react";
import Image from "next/image";
import {usePathname} from "next/navigation";

export function AuthFrame({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const isEntryRoute = pathname === "/auth/login" || pathname === "/auth/register";
  const isRegister = pathname === "/auth/register";

  return (
    <main className="relative min-h-svh overflow-hidden bg-gradient-to-r from-[#f5fbfe] to-[#fbfdfe] text-[#0b263a]">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-28 h-[620px] w-[800px] object-fill"
        height={620}
        src="/auth/ice-blue-light.svg"
        width={800}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-[23%] top-[39%] h-[390px] w-[560px] object-fill"
        height={390}
        src="/auth/brand-glow.svg"
        width={560}
      />

      <Link className="absolute left-6 top-6 z-20 sm:left-10 sm:top-8 lg:left-14 lg:top-10" href="/">
        <Image
          alt="万象硅芯 OmniS"
          className="h-auto w-[156px] lg:w-[178px]"
          height={55}
          priority
          src="/brand/omnis/OmniS-logo-horizontal-blue.svg"
          width={195}
        />
      </Link>

      <div className="relative z-10 grid min-h-svh lg:grid-cols-[56%_44%]">
        <section className="relative hidden min-h-svh overflow-hidden lg:block">
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover opacity-95"
            fill
            priority
            sizes="56vw"
            src="/auth/compute-passage.png"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[rgba(240,250,255,0.04)] via-[rgba(245,252,255,0.16)] to-[rgba(250,253,255,0.5)] backdrop-blur-[7.5px]" />
          <div className="absolute inset-y-0 right-0 w-[38%] bg-gradient-to-r from-transparent to-[rgba(249,252,254,0.88)]" />
          <div className="absolute left-[9%] top-[23%] max-w-[500px]">
            <Typography className="text-[34px] leading-[46px] tracking-[-0.03em] text-[#0b2438]" type="h1">
              {isRegister ? "创建你的平台账户" : "欢迎登录"}
            </Typography>
            <Typography className="mt-3 max-w-[430px] text-[15px] leading-[25px] text-[#476576]" type="body-sm">
              {isRegister
                ? "一个账户连接算力采购、资源供给与后续业务协作。"
                : "连接可信算力资源，轻松完成配置、下单与管理。"}
            </Typography>
          </div>
        </section>

        <section className="min-h-svh min-w-0 bg-gradient-to-b from-[rgba(251,253,254,0.88)] to-[rgba(246,251,253,0.94)] px-5 pb-12 pt-28 backdrop-blur-[18px] sm:px-10 lg:px-12 lg:pt-[clamp(7rem,16.6vh,9.375rem)]">
          <div className={`mx-auto min-w-0 w-full ${isEntryRoute ? "max-w-[434px]" : "max-w-xl"}`}>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
