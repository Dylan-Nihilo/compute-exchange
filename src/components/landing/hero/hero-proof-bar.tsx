"use client";

import {Glass, type GlassOptics} from "@samasante/liquid-glass";

import {heroContent} from "./content";

const {proof} = heroContent;

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
 */
export function HeroProofBar() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10">
      <Glass
        className="relative w-full border-y border-white/75 bg-white/[0.24] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),inset_0_-1px_0_rgba(255,255,255,0.38)]"
        optics={PROOF_GLASS_OPTICS}
      >
        <ul className="mx-auto grid w-full max-w-[77.5rem] grid-cols-2 gap-y-5 px-6 py-4 lg:grid-cols-4 lg:gap-y-0 lg:py-3.5">
          {proof.map((item) => (
            <li
              key={item.title}
              className="flex flex-col justify-center lg:h-[4.875rem] lg:border-l lg:border-white/55 lg:first:border-l-0"
            >
              <div className="w-full text-center lg:mx-auto lg:w-[11.25rem]">
                <p className="font-display text-[0.9375rem] font-medium leading-[1.32] text-cs-proof-title">
                  {item.title}
                </p>
                <p className="mt-[0.7rem] text-[0.8125rem] leading-[1.32] text-cs-proof-text">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Glass>
    </div>
  );
}
