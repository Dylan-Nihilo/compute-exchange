"use client";

import Image from "next/image";
import {useEffect, useRef, useState, type CSSProperties} from "react";
import {createPortal} from "react-dom";

import {OmnisLoader} from "@/components/system/omnis-loader";

const STILL = "/compute-spot/hero-motion-poster-ec8e5d92.webp";
const VIDEO = "/compute-spot/hero-motion-4k-2d27f117.mp4";
const LOADER_ENTRANCE_MS = 560;

type ParticleStyle = CSSProperties & {
  "--particle-delay": string;
  "--particle-size": string;
  "--particle-x": string;
  "--particle-y": string;
};

const PARTICLES = Array.from({length: 42}, (_, index): ParticleStyle => {
  const angle = ((index * 137.508) / 180) * Math.PI;
  const distance = 24 + (index % 8) * 6;

  return {
    "--particle-delay": `${(index % 7) * 14}ms`,
    "--particle-size": `${2 + (index % 4)}px`,
    "--particle-x": `${Math.cos(angle) * distance}vmax`,
    "--particle-y": `${Math.sin(angle) * distance}vmax`,
  };
});

/**
 * Hero backdrop: looping motion video lifted from Figma node 373:759,
 * with a matching first-frame poster while playback starts.
 */
export function HeroBackground() {
  const posterRef = useRef<HTMLImageElement>(null);
  const [entranceComplete, setEntranceComplete] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState<boolean | null>(null);
  const [posterReady, setPosterReady] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setEntranceComplete(true),
      LOADER_ENTRANCE_MS,
    );

    setPosterReady(Boolean(posterRef.current?.complete));
    setMotionEnabled(
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setPortalReady(true);

    return () => window.clearTimeout(timer);
  }, []);

  const mediaReady =
    entranceComplete &&
    posterReady &&
    (motionEnabled === false || videoReady);

  return (
    <>
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
              data-hero-motion-video
              className={`absolute inset-0 size-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${
                videoReady ? "opacity-100" : "opacity-0"
              }`}
              autoPlay
              muted
              loop
              onCanPlay={() => setVideoReady(true)}
              onError={() => setVideoReady(true)}
              playsInline
              preload="auto"
            >
              <source src={VIDEO} type="video/mp4" />
            </video>
          ) : null}
        </div>
      </div>
      {portalReady
        ? createPortal(
            <div
              aria-hidden={mediaReady}
              className="hero-particle-loader"
              data-state={mediaReady ? "ready" : "loading"}
            >
              <div aria-hidden className="hero-particle-loader__surface" />
              <div aria-hidden className="hero-particle-loader__particles">
                {PARTICLES.map((style, index) => (
                  <span
                    className="hero-particle-loader__particle"
                    key={index}
                    style={style}
                  />
                ))}
              </div>
              <OmnisLoader
                className="hero-particle-loader__mark"
                label="正在加载首页"
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
