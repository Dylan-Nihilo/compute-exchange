"use client";

import {useEffect, useRef, useState} from "react";

const STILL = "/compute-spot/network-motion-still.webp";
const VIDEO_DESKTOP = "/compute-spot/network-motion.mp4";
const VIDEO_MOBILE = "/compute-spot/network-motion-mobile.mp4";

/**
 * Network section backdrop: looping glow motion lifted from Figma node
 * 373:587, with a static still as its poster and reduced-motion fallback.
 */
export function NetworkBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const container = containerRef.current;
    if (!container || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      {rootMargin: "320px 0px"},
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;
    video.load();
    void video.play().catch(() => undefined);
  }, [shouldLoad]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute inset-0 overflow-hidden"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover"
        autoPlay={shouldLoad}
        muted
        loop
        playsInline
        preload={shouldLoad ? "auto" : "none"}
        poster={STILL}
      >
        {shouldLoad ? (
          <>
            <source
              media="(max-width: 767px)"
              src={VIDEO_MOBILE}
              type="video/mp4"
            />
            <source src={VIDEO_DESKTOP} type="video/mp4" />
          </>
        ) : null}
      </video>
    </div>
  );
}
