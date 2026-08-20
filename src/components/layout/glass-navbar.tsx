"use client";

import {
  Navbar,
  type NavbarRootProps,
} from "@heroui-pro/react/navbar";
import {Button} from "@heroui/react";
import {Glass, type GlassOptics} from "@samasante/liquid-glass";
import Image from "next/image";

const NAV_GLASS_OPTICS = {
  strength: 0.05,
  scaleX: 0.022,
  scaleY: 0.075,
  depth: 0.68,
  curvature: 0.26,
  dispersion: 0.32,
  bend: 0.58,
  bendWidth: 0.085,
  frost: 0.18,
  saturate: 1.22,
  brightness: 0.015,
  specular: 1.3,
  sheen: 0.8,
  sheenWidth: 1.4,
  sheenFalloff: 2.2,
  sheenAngle: 315,
  glow: 0.24,
  glowSpread: 0.34,
  glowFalloff: 2.2,
} satisfies Partial<GlassOptics>;

type GlassNavbarProps = Omit<NavbarRootProps, "position">;

export function GlassNavbar({className, ...props}: GlassNavbarProps) {
  return (
    <Glass
      className="relative h-16 w-full rounded-full border border-white/80 bg-white/[0.07] shadow-[0_18px_48px_-20px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(255,255,255,0.32)]"
      optics={NAV_GLASS_OPTICS}
    >
      <Navbar
        {...props}
        className={`size-full overflow-visible rounded-full bg-transparent ${className ?? ""}`}
        height="4rem"
        maxWidth="full"
        position="static"
      />
    </Glass>
  );
}

export function GlassNavbarBrand() {
  return (
    <Navbar.Brand>
      <Navbar.Item aria-label="万象硅芯首页" className="px-0" href="/">
        <Image
          alt="万象硅芯 OmniS"
          className="h-12 w-auto"
          height={55}
          priority
          src="/brand/omnis/OmniS-logo-horizontal-blue.svg"
          width={195}
        />
      </Navbar.Item>
    </Navbar.Brand>
  );
}

export function GlassNavbarGuestActions({
  className,
  loginLabel = "登录",
  registerLabel = "注册",
  onLogin,
  onRegister,
}: {
  className?: string;
  loginLabel?: string;
  registerLabel?: string;
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <Navbar.Content className={`gap-2 ${className ?? ""}`}>
      <Button
        className="h-[2.0625rem] w-[4.375rem] min-w-0 rounded-full border border-white/75 bg-white/35 p-0 text-[11px] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-[background-color,transform] duration-150 hover:bg-white/60 active:scale-[0.96]"
        size="sm"
        variant="ghost"
        onPress={onLogin}
      >
        {loginLabel}
      </Button>
      <Button
        className="group relative h-[2.125rem] w-[4.5rem] min-w-0 overflow-hidden rounded-full bg-cs-ink-deep p-0 text-xs font-medium text-white transition-[background-color,transform] duration-150 hover:bg-cs-ink active:scale-[0.96]"
        size="sm"
        variant="ghost"
        onPress={onRegister}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-full motion-reduce:hidden"
        />
        <span className="relative">{registerLabel}</span>
      </Button>
    </Navbar.Content>
  );
}
