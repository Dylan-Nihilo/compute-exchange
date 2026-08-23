"use client";

import {Navbar} from "@heroui-pro/react/navbar";
import {Button, Skeleton} from "@heroui/react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import {useEffect, useRef, useState} from "react";

import {heroContent} from "@/components/landing/hero/content";
import {useCurrentAccount} from "@/lib/auth/queries";
import {resolveActiveRole} from "@/lib/auth/session";
import {useAuthStore} from "@/lib/auth/store";
import {homeForRole} from "@/lib/domain/routes";

import {
  GlassNavbar,
  GlassNavbarBrand,
  GlassNavbarGuestActions,
} from "./glass-navbar";

const SPY_SECTION_IDS = ["modules", "network", "partners"] as const;
const NAV_TOP_THRESHOLD = 96;
const NAV_DIRECTION_THRESHOLD = 12;

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {scrollY} = useScroll();
  const prefersReducedMotion = useReducedMotion();
  const isLanding = pathname === "/" || pathname === "/landing";
  const isMarket = pathname.startsWith("/market");
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const directionRef = useRef<"up" | "down">("up");
  const travelRef = useRef(0);
  const accountQuery = useCurrentAccount();
  const account = accountQuery.data;
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const activeRole = useAuthStore((state) => state.activeRole);
  const isAccountPending =
    !isMounted || !hasHydrated || accountQuery.isPending;
  const workspaceHref = account
    ? homeForRole(resolveActiveRole(account.roles, activeRole))
    : null;
  const navVisible = isVisible;

  useEffect(() => setIsMounted(true), []);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? current;
    const delta = current - previous;

    if (current <= NAV_TOP_THRESHOLD) {
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
    if (travelRef.current < NAV_DIRECTION_THRESHOLD) return;

    setIsVisible(direction === "up");
    travelRef.current = 0;
  });

  useEffect(() => {
    if (!isLanding) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
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
  }, [isLanding]);

  return (
    <>
      <div
        className={`fixed inset-x-4 top-[1.875rem] z-50 will-change-[opacity] transition-opacity motion-reduce:transition-none sm:inset-x-10 ${
          navVisible
            ? "opacity-100 duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "opacity-0 duration-[140ms] ease-[cubic-bezier(0.4,0,1,1)]"
        }`}
        data-nav-visible={navVisible}
        data-public-header
        style={{pointerEvents: navVisible ? "auto" : "none"}}
        onFocusCapture={() => setIsVisible(true)}
      >
        <GlassNavbar aria-label="主导航" navigate={router.push}>
          <Navbar.Header className="relative px-5 md:px-10 xl:px-[5.9rem]">
            <GlassNavbarBrand />

            <ul
              className="absolute left-[calc(50%+3.25rem)] hidden -translate-x-1/2 items-center gap-[3.5rem] text-xs text-cs-nav lg:flex"
              onMouseLeave={() => setHoveredLink(null)}
            >
              {heroContent.nav.links.map((link) => {
                const anchorId = link.href.startsWith("#")
                  ? link.href.slice(1)
                  : null;
                const href = !isLanding && anchorId ? `/#${anchorId}` : link.href;
                const isActive =
                  (anchorId !== null && anchorId === activeSection) ||
                  (link.href === "/market" && isMarket);

                return (
                  <li
                    key={link.label}
                    onMouseEnter={() => setHoveredLink(link.label)}
                  >
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`relative py-2 transition-colors duration-150 ${
                        isActive ? "text-cs-ink" : "hover:text-cs-ink"
                      }`}
                      href={href}
                    >
                      <AnimatePresence>
                        {hoveredLink === link.label ? (
                          <motion.span
                            aria-hidden
                            animate={{opacity: 1}}
                            className="absolute -inset-x-2.5 -inset-y-1 rounded-full border border-white/60 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(255,255,255,0.3)]"
                            exit={{opacity: 0}}
                            initial={{opacity: 0}}
                            layoutId="nav-hover-pill"
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
                          />
                        ) : null}
                      </AnimatePresence>
                      <span className="relative">{link.label}</span>
                      {isActive && anchorId ? (
                        <motion.span
                          aria-hidden
                          className="absolute inset-x-0 -bottom-1 mx-auto h-[2px] w-4 rounded-full bg-cs-ink"
                          layoutId="nav-active-underline"
                          transition={
                            prefersReducedMotion
                              ? {duration: 0}
                              : {duration: 0.28, ease: [0.16, 1, 0.3, 1]}
                          }
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <Navbar.Spacer />
            {isAccountPending ? (
              <Skeleton
                aria-label="正在读取账户"
                className="hidden h-8 w-24 rounded-full lg:block"
              />
            ) : workspaceHref ? (
              <Button
                className="hidden rounded-full lg:flex"
                onPress={() => router.push(workspaceHref)}
                size="sm"
              >
                进入工作台
              </Button>
            ) : (
              <GlassNavbarGuestActions
                className="hidden lg:flex"
                loginLabel={heroContent.nav.login.label}
                registerLabel={heroContent.nav.register.label}
                onLogin={() => router.push(heroContent.nav.login.href)}
                onRegister={() => router.push(heroContent.nav.register.href)}
              />
            )}
            <Navbar.MenuToggle className="lg:hidden" srLabel="打开主导航" />
          </Navbar.Header>

          <Navbar.Menu className="mt-2 rounded-[1.75rem] border border-white/80 bg-white/90 shadow-[0_18px_48px_-20px_rgba(15,23,42,0.22)] backdrop-blur-2xl">
            {heroContent.nav.links.map((link) => {
              const href =
                !isLanding && link.href.startsWith("#")
                  ? `/${link.href}`
                  : link.href;
              return (
                <Navbar.MenuItem
                  href={href}
                  isCurrent={link.href === "/market" && isMarket}
                  key={link.label}
                >
                  {link.label}
                </Navbar.MenuItem>
              );
            })}
            {isAccountPending ? null : workspaceHref ? (
              <Navbar.MenuItem href={workspaceHref}>进入工作台</Navbar.MenuItem>
            ) : (
              <>
                <Navbar.MenuItem href={heroContent.nav.login.href}>
                  {heroContent.nav.login.label}
                </Navbar.MenuItem>
                <Navbar.MenuItem href={heroContent.nav.register.href}>
                  {heroContent.nav.register.label}
                </Navbar.MenuItem>
              </>
            )}
          </Navbar.Menu>
        </GlassNavbar>
      </div>
      {isLanding ? null : <div aria-hidden="true" className="h-[5.875rem]" />}
    </>
  );
}
