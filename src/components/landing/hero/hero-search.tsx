"use client";

import {Button} from "@heroui/react";
import {AnimatePresence, motion, useReducedMotion} from "motion/react";
import {useRouter} from "next/navigation";
import {useEffect, useRef, useState, type FormEvent} from "react";

import {heroContent} from "./content";

const {search} = heroContent;

/** How long one example term stays on screen before the next rotates in. */
const EXAMPLE_CYCLE_MS = 3000;

/**
 * GPU model search box (Figma node 373:509). Submits into the market route;
 * while the route lockdown is active the middleware bounces it back home.
 *
 * While the field is empty and unfocused, the placeholder is replaced by an
 * animated overlay: example GPU terms rotate in a per-character stagger
 * (echoing the dot-matrix wave reference). On focus the animated layer
 * crossfades into the static full placeholder; on input it fades out
 * entirely. The submit button sweeps a soft light band on hover. All motion
 * is disabled under reduced motion.
 */
export function HeroSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);

  const showAnimatedPlaceholder =
    !prefersReducedMotion && !isFocused && !hasValue;
  const showStaticPlaceholder =
    !hasValue && (isFocused || prefersReducedMotion);

  useEffect(() => {
    if (!showAnimatedPlaceholder) return;
    const timer = setInterval(() => {
      setExampleIndex((index) => (index + 1) % search.examples.length);
    }, EXAMPLE_CYCLE_MS);
    return () => clearInterval(timer);
  }, [showAnimatedPlaceholder]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = inputRef.current?.value.trim();
    router.push(
      query ? `${search.target}?q=${encodeURIComponent(query)}` : search.target,
    );
  }

  const example = search.examples[exampleIndex];

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex h-[3.25rem] w-full max-w-[33.125rem] items-center rounded-[2.1875rem] border border-cs-ink/5 bg-white/80 p-1.5 backdrop-blur-sm"
    >
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          type="search"
          name="q"
          autoComplete="off"
          placeholder=""
          aria-label={search.placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => setHasValue(event.target.value.length > 0)}
          className="w-full bg-transparent px-3.5 text-xs text-cs-ink outline-none placeholder:text-cs-placeholder"
        />
        <AnimatePresence>
          {showAnimatedPlaceholder && (
            <motion.div
              key="animated-placeholder"
              aria-hidden
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.2,
                ease: "easeOut",
              }}
              className="pointer-events-none absolute inset-0 flex items-center px-3.5 text-xs text-cs-placeholder"
            >
              <span className="whitespace-pre">{search.placeholderPrefix}</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={exampleIndex}
                  className="inline-flex whitespace-pre"
                >
                  {Array.from(example).map((char, index) => (
                    <motion.span
                      key={`${exampleIndex}-${index}`}
                      initial={{opacity: 0, y: 6}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -6}}
                      transition={{
                        delay: index * 0.035,
                        duration: 0.28,
                        ease: "easeOut",
                      }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}
          {showStaticPlaceholder && (
            <motion.div
              key="static-placeholder"
              aria-hidden
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.2,
                ease: "easeOut",
              }}
              className="pointer-events-none absolute inset-0 flex items-center truncate px-3.5 text-xs text-cs-placeholder"
            >
              {search.placeholder}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="group relative h-10 w-[5.75rem] min-w-0 shrink-0 overflow-hidden rounded-[1.6875rem] bg-cs-ink p-0 text-xs font-medium text-white transition-[background-color,transform] duration-150 hover:bg-cs-ink-deep active:scale-[0.97]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/2 bg-white/20 blur-[2px] group-hover:block group-hover:animate-sheen-sweep motion-reduce:hidden"
        />
        <span className="relative">{search.submitLabel}</span>
      </Button>
    </form>
  );
}
