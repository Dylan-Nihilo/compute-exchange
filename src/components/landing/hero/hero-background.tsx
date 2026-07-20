"use client";

import {useEffect, useRef} from "react";

const STILL = "/compute-spot/hero-motion-still.png";
const VIDEO = "/compute-spot/hero-motion.mp4";

/**
 * Hero backdrop: looping motion video lifted from Figma node 373:759,
 * with a static still as its poster and reduced-motion fallback.
 */
export function HeroBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.removeAttribute("autoplay");
    }
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={STILL}
      >
        <source src={VIDEO} type="video/mp4" />
      </video>
    </div>
  );
}
