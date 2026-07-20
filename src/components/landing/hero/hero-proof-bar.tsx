"use client";

import {Glass, type GlassOptics} from "@samasante/liquid-glass";

import {heroContent} from "./content";

const {proof} = heroContent;

const PROOF_GLASS_OPTICS = {
  strength: 0.032,
  scaleX: 0.012,
  scaleY: 0.045,
  depth: 0.5,
  curvature: 0.16,
  dispersion: 0.18,
  bend: 0.42,
  bendWidth: 0.12,
  frost: 1.5,
  brightness: 0.08,
  specular: 0.9,
  sheen: 0.46,
  glow: 0.16,
} satisfies Partial<GlassOptics>;

/**
 * Frosted proof strip pinned to the hero's bottom edge (Figma node 373:520).
 * Four trust items separated by hairline dividers on desktop.
 */
export function HeroProofBar() {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10">
      <Glass
        className="relative w-full border-y border-white/55 bg-white/22"
        optics={PROOF_GLASS_OPTICS}
      >
        <ul className="mx-auto grid w-full max-w-[77.5rem] grid-cols-2 gap-y-5 px-6 py-4 lg:grid-cols-4 lg:gap-y-0 lg:py-3.5">
          {proof.map((item, index) => (
            <li
              key={item.title}
              className={
                index === 0
                  ? "flex flex-col justify-center lg:h-[4.875rem]"
                  : "flex flex-col justify-center lg:h-[4.875rem] lg:border-l lg:border-cs-divider lg:pl-[2.7rem]"
              }
            >
              <p className="font-display text-[0.9375rem] font-medium leading-[1.32] text-cs-proof-title">
                {item.title}
              </p>
              <p className="mt-[0.7rem] text-[0.8125rem] leading-[1.32] text-cs-proof-text">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </Glass>
    </div>
  );
}
