"use client";

import {Glass, type GlassOptics} from "@samasante/liquid-glass";
import {motion, useReducedMotion, type Variants} from "motion/react";

import {heroContent} from "./content";

const {proof} = heroContent;

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const PROOF_GLASS_OPTICS = {
  strength: 0.015,
  scaleX: 0.006,
  scaleY: 0.028,
  depth: 0.48,
  curvature: 0.12,
  dispersion: 0.1,
  bend: 0.32,
  bendWidth: 0.09,
  frost: 0.35,
  saturate: 1.08,
  brightness: 0.03,
  specular: 1,
  sheen: 0.55,
  sheenWidth: 1.25,
  sheenFalloff: 2.1,
  sheenAngle: 315,
  glow: 0.2,
  glowSpread: 0.32,
  glowFalloff: 2.2,
} satisfies Partial<GlassOptics>;

/**
 * Frosted proof strip pinned to the hero's bottom edge (Figma node 373:520).
 * Four trust items separated by hairline dividers on desktop.
 *
 * Interaction layers: the strip enters last in the hero choreography (glass
 * fades up, items rise in a stagger), each item reveals a small accent tick
 * under its title on hover with a faint wash, and the hairline divider next
 * to the hovered item brightens. All motion is instant under reduced motion.
 */
export function HeroProofBar() {
  const prefersReducedMotion = useReducedMotion();

  const strip: Variants = {
    hidden: {opacity: 0, y: 14},
    show: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? {duration: 0}
        : {delay: 0.75, duration: 0.5, ease: EASE_OUT_EXPO},
    },
  };

  const list: Variants = {
    hidden: {},
    show: {
      transition: prefersReducedMotion
        ? {}
        : {staggerChildren: 0.06, delayChildren: 0.95},
    },
  };

  const item: Variants = {
    hidden: {opacity: 0, y: 10},
    show: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? {duration: 0}
        : {duration: 0.45, ease: EASE_OUT_EXPO},
    },
  };

  return (
    <motion.div
      variants={strip}
      initial="hidden"
      animate="show"
      className="absolute inset-x-0 bottom-0 z-10"
    >
      <Glass
        className="relative w-full border-y border-white/75 bg-white/[0.24] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),inset_0_-1px_0_rgba(255,255,255,0.38)]"
        optics={PROOF_GLASS_OPTICS}
      >
        <motion.ul
          variants={list}
          className="mx-auto grid w-full max-w-[77.5rem] grid-cols-2 gap-y-5 px-6 py-4 lg:grid-cols-4 lg:gap-y-0 lg:py-3.5"
        >
          {proof.map((entry) => (
            <motion.li
              key={entry.title}
              variants={item}
              className="group flex flex-col justify-center transition-colors duration-200 hover:bg-white/15 lg:h-[4.875rem] lg:border-l lg:border-white/55 lg:first:border-l-0 lg:[li:hover+&]:border-white/85"
            >
              <div className="w-full text-center lg:mx-auto lg:w-[11.25rem]">
                <p className="font-display text-[0.9375rem] font-medium leading-[1.32] text-cs-proof-title">
                  {entry.title}
                </p>
                <span
                  aria-hidden
                  className="mx-auto mt-[0.25rem] block h-[2px] w-4 origin-center scale-x-0 rounded-full bg-cs-accent transition-transform duration-200 ease-out group-hover:scale-x-100"
                />
                <p className="mt-[0.32rem] text-[0.8125rem] leading-[1.32] text-cs-proof-text">
                  {entry.description}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </Glass>
    </motion.div>
  );
}
