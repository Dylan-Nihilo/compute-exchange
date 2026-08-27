"use client";

import Image from "next/image";
import {useEffect, useRef, useState, type CSSProperties} from "react";

const STILL = "/compute-spot/hero-motion-poster-ec8e5d92.webp";
const VIDEO = "/compute-spot/hero-motion-4k-88aaafcc.mp4";
const HERO_READY_EVENT = "omnis:hero-ready";
const LOADER_LETTERS = [..."OMNIS"];
const LOADER_BLINDS = Array.from({length: 12});

type LoaderDelayStyle = CSSProperties & {
  "--loader-delay": string;
};

function startPlayback(video: HTMLVideoElement | null) {
  if (video) void video.play().catch(() => undefined);
}

/**
 * Hero backdrop: looping motion video lifted from Figma node 373:759,
 * with a matching first-frame poster while playback starts.
 */
export function HeroBackground() {
  const posterRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionEnabled, setMotionEnabled] = useState<boolean | null>(null);
  const [posterReady, setPosterReady] = useState(false);
  const [videoState, setVideoState] = useState<
    "pending" | "playing" | "failed"
  >("pending");

  useEffect(() => {
    setPosterReady(Boolean(posterRef.current?.complete));
    setMotionEnabled(
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    if (motionEnabled) startPlayback(videoRef.current);
  }, [motionEnabled]);

  const mediaReady =
    posterReady &&
    (motionEnabled === false || videoState !== "pending");

  useEffect(() => {
    if (mediaReady) window.dispatchEvent(new Event(HERO_READY_EVENT));
  }, [mediaReady]);

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
              videoState === "playing" ? "opacity-100" : "opacity-0"
            }`}
            autoPlay
            muted
            loop
            onCanPlay={() => startPlayback(videoRef.current)}
            onError={() => setVideoState("failed")}
            onPlaying={() => setVideoState("playing")}
            playsInline
            preload="auto"
          >
            <source src={VIDEO} type="video/mp4" />
          </video>
        ) : null}
      </div>
    </div>
  );
}

export function HeroSpectrumLoader() {
  // 无入场下限: hero 媒体就绪(poster 加载完 + 视频起播/失败/reduced-motion)即隐藏,
  // 不保证字母动画播完一轮。
  const [heroReady, setHeroReady] = useState(false);
  const isReady = heroReady;

  useEffect(() => {
    const handleReady = () => setHeroReady(true);
    window.addEventListener(HERO_READY_EVENT, handleReady, {once: true});

    return () => {
      window.removeEventListener(HERO_READY_EVENT, handleReady);
    };
  }, []);

  return (
    <div
      aria-hidden={isReady}
      className="hero-spectrum-loader"
      data-state={isReady ? "ready" : "loading"}
    >
      <div aria-hidden className="hero-spectrum-loader__curtain">
        {LOADER_BLINDS.map((_, index) => (
          <span
            className="hero-spectrum-loader__blind"
            key={index}
            style={{"--loader-delay": `${index * 18}ms`} as LoaderDelayStyle}
          />
        ))}
      </div>
      <div
        aria-label="正在加载首页"
        aria-live="polite"
        className="hero-spectrum-loader__signal"
        role="status"
      >
        <div aria-hidden className="hero-spectrum-loader__spectrum" />
        {LOADER_LETTERS.map((letter, index) => (
          <span
            aria-hidden
            className="hero-spectrum-loader__letter"
            key={letter}
            style={{"--loader-delay": `${index * 90}ms`} as LoaderDelayStyle}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}
