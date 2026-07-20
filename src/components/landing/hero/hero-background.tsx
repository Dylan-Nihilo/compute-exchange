"use client";

import {useEffect, useRef} from "react";

const STILL = "/compute-spot/hero-motion-still.webp";
const VIDEO_DESKTOP = "/compute-spot/hero-motion.mp4";
const VIDEO_MOBILE = "/compute-spot/hero-motion-mobile.mp4";

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
        <source media="(max-width: 767px)" src={VIDEO_MOBILE} type="video/mp4" />
        <source src={VIDEO_DESKTOP} type="video/mp4" />
      </video>
    </div>
  );
}
