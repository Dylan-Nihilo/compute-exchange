"use client";

import {buttonVariants} from "@heroui/react";
import Link from "next/link";

import {heroContent} from "./content";
import {HeroSearch} from "./hero-search";

const {title, body, ctas, support} = heroContent;

export function HeroContent() {
  return (
    <div
      data-hero="content"
      className="w-full max-w-[35.5rem] pt-[clamp(10.75rem,21.25svh,28rem)] pb-[8rem]"
    >
      <h1 className="font-display text-[clamp(2.25rem,4.31vw,3.875rem)] leading-[1.28] font-semibold tracking-[-0.01em] text-cs-ink">
        {title.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>

      <p
        className="mt-4 max-w-[35.5rem] text-base leading-[1.575] text-cs-body"
      >
        {body}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <HeroSearch />

        <div className="flex items-center gap-3">
          <Link
            href={ctas.primary.href}
            prefetch={false}
            className={`${buttonVariants({size: "sm", variant: "ghost"})} group h-[2.66rem] min-w-0 rounded-full bg-cs-accent px-[1.1rem] text-xs text-cs-accent-ink transition-[box-shadow,transform,filter] duration-200 hover:shadow-[0_10px_24px_-10px_rgba(90,110,10,0.55)] hover:brightness-105 active:scale-[0.97]`}
          >
            <span>{ctas.primary.label}</span>
            <span
              aria-hidden
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              ↗
            </span>
          </Link>
          <Link
            href={ctas.secondary.href}
            prefetch={false}
            className={`${buttonVariants({size: "sm", variant: "ghost"})} group h-[2.66rem] min-w-0 rounded-full border border-cs-ink/20 bg-white/45 px-[1.1rem] text-xs text-cs-ink transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-cs-ink/35 hover:bg-white/80 hover:shadow-[0_10px_24px_-12px_rgba(15,23,42,0.35)] active:scale-[0.97]`}
          >
            <span>{ctas.secondary.label}</span>
            <span
              aria-hidden
              className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              ↗
            </span>
          </Link>
        </div>

        <p className="text-[0.625rem] text-cs-faint">{support}</p>
      </div>
    </div>
  );
}
