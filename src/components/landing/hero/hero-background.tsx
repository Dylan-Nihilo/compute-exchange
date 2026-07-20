"use client";

import {useEffect, useRef, useState} from "react";

const STILL = "/compute-spot/hero-motion-still.webp";
const VIDEO_DESKTOP = "/compute-spot/hero-motion.mp4";
const VIDEO_MOBILE = "/compute-spot/hero-motion-mobile.mp4";

/**
 * Hero backdrop: looping motion video lifted from Figma node 373:759,
 * with a static still as its poster and reduced-motion fallback.
 */
export function HeroBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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
      <div
        data-hero-motion-fallback
        className={`absolute inset-[-2%] bg-cover bg-center transition-opacity duration-700 motion-safe:animate-[cs-hero-drift_10s_ease-in-out_infinite_alternate] ${
          isPlaying ? "opacity-0" : "opacity-100"
        }`}
        style={{backgroundImage: `url(${STILL})`}}
      />
      <video
        ref={videoRef}
        data-hero-motion-video
        className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ${
          isPlaying ? "opacity-100" : "opacity-0"
        }`}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={STILL}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsPlaying(false)}
      >
        <source media="(max-width: 767px)" src={VIDEO_MOBILE} type="video/mp4" />
        <source src={VIDEO_DESKTOP} type="video/mp4" />
      </video>
    </div>
  );
}
