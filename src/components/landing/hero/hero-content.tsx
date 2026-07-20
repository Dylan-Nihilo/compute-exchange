"use client";

import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";

import {heroContent} from "./content";
import {HeroSearch} from "./hero-search";

const {title, body, ctas, support} = heroContent;

/**
 * Left-aligned hero copy column (Figma node 373:501):
 * display title, sub copy, compute search, CTA pair and spec footnote.
 */
export function HeroContent() {
  const router = useRouter();

  return (
    <div
      data-hero="content"
      className="w-full max-w-[35.5rem] pt-[10.75rem] pb-[8rem]"
    >
      <h1 className="font-display text-[clamp(2.25rem,4.31vw,3.875rem)] leading-[1.4] font-medium text-cs-ink">
        {title.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>

      <p className="mt-3 max-w-[35.5rem] text-base leading-[1.575] text-cs-body">
        {body}
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <HeroSearch />

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onPress={() => router.push(ctas.primary.href)}
            className="h-[2.66rem] min-w-0 rounded-full bg-cs-accent px-[1.1rem] text-xs text-cs-accent-ink hover:brightness-95"
          >
            {ctas.primary.label}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => router.push(ctas.secondary.href)}
            className="h-[2.66rem] min-w-0 rounded-full border border-cs-ink/20 bg-white/45 px-[1.1rem] text-xs text-cs-ink hover:bg-white/70"
          >
            {ctas.secondary.label}
          </Button>
        </div>

        <p className="text-[0.625rem] text-cs-faint">{support}</p>
      </div>
    </div>
  );
}
