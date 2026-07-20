"use client";

import {Button} from "@heroui/react";
import {Glass, type GlassOptics} from "@samasante/liquid-glass";
import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import {useRef, useState} from "react";

import {heroContent} from "./content";

const {nav} = heroContent;

const NAV_GLASS_OPTICS = {
  strength: 0.04,
  scaleX: 0.018,
  scaleY: 0.06,
  depth: 0.55,
  curvature: 0.2,
  dispersion: 0.22,
  bend: 0.48,
  bendWidth: 0.12,
  frost: 1.5,
  brightness: 0.07,
  specular: 1,
  sheen: 0.62,
  glow: 0.2,
} satisfies Partial<GlassOptics>;

/**
 * Floating glass navigation pill (Figma node 373:488). It stays available
 * across the landing page, hides while scrolling down, and returns on scroll up.
 */
export function HeroNav() {
  const router = useRouter();
  const {scrollY} = useScroll();
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const directionRef = useRef<"up" | "down">("up");
  const travelRef = useRef(0);
  const navVisible = prefersReducedMotion || isVisible;

  useMotionValueEvent(scrollY, "change", (current) => {
    if (prefersReducedMotion) return;

    const previous = scrollY.getPrevious() ?? current;
    const delta = current - previous;

    if (current < 180) {
      directionRef.current = "up";
      travelRef.current = 0;
      setIsVisible(true);
      return;
    }

    if (Math.abs(delta) < 1) return;

    const direction = delta > 0 ? "down" : "up";
    if (direction !== directionRef.current) {
      directionRef.current = direction;
      travelRef.current = 0;
    }

    travelRef.current += Math.abs(delta);

    if (direction === "down" && travelRef.current > 96) {
      setIsVisible(false);
      travelRef.current = 0;
    } else if (direction === "up" && travelRef.current > 16) {
      setIsVisible(true);
      travelRef.current = 0;
    }
  });

  return (
    <motion.header
      data-nav-visible={navVisible}
      initial={false}
      animate={{
        y: navVisible ? 0 : -40,
        opacity: navVisible ? 1 : 0,
      }}
      transition={
        prefersReducedMotion
          ? {duration: 0}
          : navVisible
            ? {duration: 0.42, ease: [0.16, 1, 0.3, 1]}
            : {duration: 0.32, ease: [0.7, 0, 0.84, 0]}
      }
      onFocusCapture={() => setIsVisible(true)}
      className="fixed inset-x-4 top-[1.875rem] z-50 sm:inset-x-10"
      style={{pointerEvents: navVisible ? "auto" : "none"}}
    >
      <Glass
        className="relative h-16 w-full rounded-full border border-white/65 bg-white/12 shadow-[0_18px_48px_-18px_rgba(15,23,42,0.26)]"
        optics={NAV_GLASS_OPTICS}
      >
        <nav
          aria-label="主导航"
          className="relative flex size-full items-center justify-between px-5 md:px-10 xl:px-[5.9rem]"
        >
          <Link href="/" aria-label="ComputeSpot 首页" className="shrink-0">
            <Image
              src="/compute-spot/logo.png"
              alt="ComputeSpot"
              width={189}
              height={46}
              priority
              className="h-9 w-auto"
            />
          </Link>

          <ul className="absolute left-[calc(50%+3.25rem)] hidden -translate-x-1/2 items-center gap-[2.18rem] text-xs text-cs-nav lg:flex">
            {nav.links.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="transition-colors duration-150 hover:text-cs-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => router.push(nav.login.href)}
              className="h-[2.0625rem] w-[4.375rem] min-w-0 rounded-full border border-cs-ink/20 bg-white/45 p-0 text-[11px] text-black hover:bg-white/70"
            >
              {nav.login.label}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => router.push(nav.register.href)}
              className="h-[2.125rem] w-[4.5rem] min-w-0 rounded-full bg-cs-ink-deep p-0 text-xs font-medium text-white hover:bg-cs-ink"
            >
              {nav.register.label}
            </Button>
          </div>
        </nav>
      </Glass>
    </motion.header>
  );
}
