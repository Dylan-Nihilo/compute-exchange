"use client";

import {useEffect, useRef} from "react";

const STILL = "/compute-spot/hero-motion-poster-ec8e5d92.webp";
const VIDEO = "/compute-spot/hero-motion-4k-2d27f117.mp4";

/**
 * Hero backdrop: looping motion video lifted from Figma node 373:759,
 * with a matching first-frame poster while playback starts.
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
        data-hero-motion-video
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
