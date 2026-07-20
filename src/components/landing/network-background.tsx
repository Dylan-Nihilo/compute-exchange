"use client";

import {useEffect, useRef} from "react";

const STILL = "/compute-spot/network-motion-still.png";
const VIDEO = "/compute-spot/network-motion.mp4";

/**
 * Network section backdrop: looping glow motion lifted from Figma node
 * 373:587, with a static still as its poster and reduced-motion fallback.
 */
export function NetworkBackground() {
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
