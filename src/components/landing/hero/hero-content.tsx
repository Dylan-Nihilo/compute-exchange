"use client";

import {Button} from "@heroui/react";
import {motion, useReducedMotion, type Variants} from "motion/react";
import {useRouter} from "next/navigation";

import {heroContent} from "./content";
import {HeroSearch} from "./hero-search";

const {title, body, ctas, support} = heroContent;

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * Left-aligned hero copy column (Figma node 373:501):
 * display title, sub copy, compute search, CTA pair and spec footnote.
 * The copy column enters as one choreographed stagger on load; CTAs carry
 * an arrow-nudge + lift hover and a press-down feedback.
 */
export function HeroContent() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: {staggerChildren: 0.09, delayChildren: 0.12},
    },
  };

  const rise: Variants = {
    hidden: {opacity: 0, y: 18},
    show: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? {duration: 0}
        : {duration: 0.55, ease: EASE_OUT_EXPO},
    },
  };

  return (
    <motion.div
      data-hero="content"
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-[35.5rem] pt-[clamp(10.75rem,21.25svh,28rem)] pb-[8rem]"
    >
      <h1 className="font-display text-[clamp(2.25rem,4.31vw,3.875rem)] leading-[1.28] font-semibold tracking-[-0.01em] text-cs-ink">
        {title.map((line) => (
          <motion.span key={line} variants={rise} className="block">
            {line}
          </motion.span>
        ))}
      </h1>

      <motion.p
        variants={rise}
        className="mt-4 max-w-[35.5rem] text-base leading-[1.575] text-cs-body"
      >
        {body}
      </motion.p>

      <motion.div variants={rise} className="mt-8 flex flex-col gap-3">
        <HeroSearch />

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onPress={() => router.push(ctas.primary.href)}
            className="group h-[2.66rem] min-w-0 rounded-full bg-cs-accent px-[1.1rem] text-xs text-cs-accent-ink transition-[box-shadow,transform,filter] duration-200 hover:shadow-[0_10px_24px_-10px_rgba(90,110,10,0.55)] hover:brightness-105 active:scale-[0.97]"
          >
            <span>{ctas.primary.label}</span>
            <span
              aria-hidden
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              ↗
            </span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => router.push(ctas.secondary.href)}
            className="group h-[2.66rem] min-w-0 rounded-full border border-cs-ink/20 bg-white/45 px-[1.1rem] text-xs text-cs-ink transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-cs-ink/35 hover:bg-white/80 hover:shadow-[0_10px_24px_-12px_rgba(15,23,42,0.35)] active:scale-[0.97]"
          >
            <span>{ctas.secondary.label}</span>
            <span
              aria-hidden
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              ↗
            </span>
          </Button>
        </div>

        <p className="text-[0.625rem] text-cs-faint">{support}</p>
      </motion.div>
    </motion.div>
  );
}
