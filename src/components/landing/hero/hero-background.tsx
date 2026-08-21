"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";

import {RouteLoading} from "@/components/layout/route-loading";

const STILL = "/compute-spot/hero-motion-poster-ec8e5d92.webp";
const VIDEO_DESKTOP = "/compute-spot/hero-motion-desktop-a2a846ab.mp4";
const VIDEO_MOBILE = "/compute-spot/hero-motion-mobile-a7f415e0.mp4";

/**
 * Hero backdrop: looping motion video lifted from Figma node 373:759,
 * with a matching first-frame poster while playback starts.
 */
export function HeroBackground() {
  const posterRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    setPosterReady(Boolean(posterRef.current?.complete));
    setMotionEnabled(
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div aria-hidden className="absolute inset-0">
        <Image
          ref={posterRef}
          alt=""
          className="object-cover"
          fill
          onError={() => setPosterReady(true)}
          onLoad={() => setPosterReady(true)}
          priority
          sizes="100vw"
          src={STILL}
        />
        {motionEnabled ? (
          <video
            ref={videoRef}
            data-hero-motion-video
            className={`absolute inset-0 size-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
            autoPlay
            muted
            loop
            onCanPlay={() => setVideoReady(true)}
            playsInline
            preload="metadata"
          >
            <source
              media="(max-width: 767px)"
              src={VIDEO_MOBILE}
              type="video/mp4"
            />
            <source src={VIDEO_DESKTOP} type="video/mp4" />
          </video>
        ) : null}
      </div>
      {!posterReady ? <RouteLoading label="正在加载首页" /> : null}
    </div>
  );
}
