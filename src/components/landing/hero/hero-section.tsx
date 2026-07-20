import {HeroBackground} from "./hero-background";
import {HeroContent} from "./hero-content";
import {HeroProofBar} from "./hero-proof-bar";

/**
 * Landing hero section (Figma frame 373:485, 1440x810).
 * Composed from small parts so GSAP scroll choreography can target
 * `data-hero` / `data-section` hooks without restructuring the tree.
 */
export function HeroSection() {
  return (
    <section
      id="hero"
      data-section="hero"
      className="relative isolate flex min-h-[42.5rem] flex-col overflow-hidden bg-cs-canvas text-cs-ink lg:min-h-[min(50.5rem,100svh)]"
    >
      <HeroBackground />
      <div className="relative z-10 mx-auto flex w-full max-w-[77.5rem] flex-1 items-start px-6 xl:px-0">
        <HeroContent />
      </div>
      <HeroProofBar />
    </section>
  );
}
