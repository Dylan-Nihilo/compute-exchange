"use client";

import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";
import {useRef, type FormEvent} from "react";

import {heroContent} from "./content";

const {search} = heroContent;

/**
 * GPU model search box (Figma node 373:509). Submits into the market route;
 * while the route lockdown is active the middleware bounces it back home.
 */
export function HeroSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = inputRef.current?.value.trim();
    router.push(
      query ? `${search.target}?q=${encodeURIComponent(query)}` : search.target,
    );
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex h-[3.25rem] w-full max-w-[33.125rem] items-center rounded-[2.1875rem] border border-cs-ink/5 bg-white/80 p-1.5 backdrop-blur-sm"
    >
      <input
        ref={inputRef}
        type="search"
        name="q"
        autoComplete="off"
        placeholder={search.placeholder}
        aria-label={search.placeholder}
        className="min-w-0 flex-1 bg-transparent px-3.5 text-xs text-cs-ink outline-none placeholder:text-cs-placeholder"
      />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="h-10 w-[5.75rem] min-w-0 shrink-0 rounded-[1.6875rem] bg-cs-ink p-0 text-xs font-medium text-white hover:bg-cs-ink-deep"
      >
        {search.submitLabel}
      </Button>
    </form>
  );
}
