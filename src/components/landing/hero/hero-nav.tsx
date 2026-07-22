"use client";

import {Button} from "@heroui/react";
import {Glass, type GlassOptics} from "@samasante/liquid-glass";
import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import {useEffect, useRef, useState} from "react";

import {heroContent} from "./content";

const {nav} = heroContent;

/** Anchor sections mirrored by the scroll-spy, in document order. */
const SPY_SECTION_IDS = ["modules", "network", "partners"] as const;

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

/**
 * Floating glass navigation pill (Figma node 373:488). It keeps the same
 * liquid-glass optics across the whole page, hides while scrolling down, and
 * returns on scroll up. Interaction layers: links glide a small frosted-glass
 * chip via layoutId (fading in/out instead of popping), a scroll-spy marks
 * the current anchor section, and the CTAs carry restrained press/sheen
 * micro-interactions. All motion degrades to instant under reduced motion.
 */
export function HeroNav() {
  const router = useRouter();
  const {scrollY} = useScroll();
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
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

  // Scroll-spy: highlight the anchor link whose section crosses the
  // middle band of the viewport. Clears when no spy section is in view.
  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        setActiveSection(
          SPY_SECTION_IDS.find((id) => visible.has(id)) ?? null,
        );
      },
      {rootMargin: "-38% 0px -55% 0px"},
    );

    for (const id of SPY_SECTION_IDS) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

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
        className="relative h-16 w-full rounded-full border border-white/80 bg-white/[0.07] shadow-[0_18px_48px_-20px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(255,255,255,0.32)]"
        optics={NAV_GLASS_OPTICS}
      >
        <nav
          aria-label="主导航"
          className="relative flex size-full items-center justify-between px-5 md:px-10 xl:px-[5.9rem]"
        >
          <Link
            href="/"
            aria-label="ComputeSpot 首页"
            className="shrink-0 transition-opacity duration-150 hover:opacity-75"
          >
            <Image
              src="/compute-spot/logo.png"
              alt="ComputeSpot"
              width={189}
              height={46}
              priority
              className="h-9 w-auto"
            />
          </Link>

          <ul
            onMouseLeave={() => setHoveredLink(null)}
            className="absolute left-[calc(50%+3.25rem)] hidden -translate-x-1/2 items-center gap-[3.5rem] text-xs text-cs-nav lg:flex"
          >
            {nav.links.map((link) => {
              const anchorId = link.href.startsWith("#")
                ? link.href.slice(1)
                : null;
              const isActive = anchorId !== null && anchorId === activeSection;

              return (
                <li
                  key={link.label}
                  onMouseEnter={() => setHoveredLink(link.label)}
                >
                  <Link
                    href={link.href}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative py-2 transition-colors duration-150 ${
                      isActive ? "text-cs-ink" : "hover:text-cs-ink"
                    }`}
                  >
                    <AnimatePresence>
                      {hoveredLink === link.label && (
                        <motion.span
                          layoutId="nav-hover-pill"
                          aria-hidden
                          initial={{opacity: 0}}
                          animate={{opacity: 1}}
                          exit={{opacity: 0}}
                          transition={
                            prefersReducedMotion
                              ? {duration: 0}
                              : {
                                  layout: {
                                    duration: 0.36,
                                    ease: [0.22, 1, 0.36, 1],
                                  },
                                  opacity: {duration: 0.26, ease: "easeOut"},
                                }
                          }
                          className="absolute -inset-x-2.5 -inset-y-1 rounded-full border border-white/60 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(255,255,255,0.3)]"
                        />
                      )}
                    </AnimatePresence>
                    <span className="relative">{link.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-underline"
                        aria-hidden
                        transition={
                          prefersReducedMotion
                            ? {duration: 0}
                            : {duration: 0.28, ease: [0.16, 1, 0.3, 1]}
                        }
                        className="absolute inset-x-0 -bottom-1 mx-auto h-[2px] w-4 rounded-full bg-cs-ink"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => router.push(nav.login.href)}
              className="h-[2.0625rem] w-[4.375rem] min-w-0 rounded-full border border-white/75 bg-white/35 p-0 text-[11px] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-[background-color,transform] duration-150 hover:bg-white/60 active:scale-[0.96]"
            >
              {nav.login.label}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => router.push(nav.register.href)}
              className="group relative h-[2.125rem] w-[4.5rem] min-w-0 overflow-hidden rounded-full bg-cs-ink-deep p-0 text-xs font-medium text-white transition-[background-color,transform] duration-150 hover:bg-cs-ink active:scale-[0.96]"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-full motion-reduce:hidden"
              />
              <span className="relative">{nav.register.label}</span>
            </Button>
          </div>
        </nav>
      </Glass>
    </motion.header>
  );
}
