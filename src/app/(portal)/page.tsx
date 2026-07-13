import Link from "next/link";

import {LaunchTitle} from "@/components/landing/launch-title";
import {ParticleField} from "@/components/landing/particle-field";

export default function HomePage() {
  return (
    <main className="launch-page">
      <ParticleField />
      <LaunchTitle />
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <span className="text-xs font-semibold tracking-[0.16em] text-foreground">
          COMPUTE EXCHANGE
        </span>
        <nav aria-label="主导航" className="flex items-center gap-2">
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            href="/market"
          >
            算力市场
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            href="/auth/login"
          >
            进入工作台
          </Link>
        </nav>
      </header>
    </main>
  );
}
