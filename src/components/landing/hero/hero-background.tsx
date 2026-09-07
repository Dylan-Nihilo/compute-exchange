"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";

const STILL = "/compute-spot/hero-motion-poster-ec8e5d92.webp";
const VIDEO = "/compute-spot/hero-motion-4k-88aaafcc.mp4";
// The unchanged 7.42 MB / 4.5 s clip needs more time than a compressed preview.
const MEDIA_TIMEOUT_MS = 20_000;

export function HeroBackground() {
  const posterRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection;
    const update = () => setMotionEnabled(!preference.matches && !connection?.saveData);
    update();
    setPosterReady(Boolean(posterRef.current?.complete));
    // A stalled poster must not hold the independent video request indefinitely.
    const posterDeadline = window.setTimeout(() => setPosterReady(true), 2_000);
    preference.addEventListener("change", update);
    return () => {
      window.clearTimeout(posterDeadline);
      preference.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    setPlaying(false);
    const element = videoRef.current;
    if (!motionEnabled || !posterReady || !element) return;
    const video = element;

    const controller = new AbortController();
    let disposed = false;
    let objectUrl: string | undefined;
    let frame: number | undefined;
    let revealed = false;
    const timer = window.setTimeout(fail, MEDIA_TIMEOUT_MS);

    function cleanup() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      window.clearTimeout(timer);
      if (frame !== undefined) video.cancelVideoFrameCallback(frame);
      video.removeEventListener("playing", firstFrame);
      video.removeEventListener("timeupdate", fallbackFrame);
      video.removeEventListener("error", fail);
      document.removeEventListener("visibilitychange", visibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
    function fail() {
      if (disposed) return;
      setPlaying(false);
      cleanup();
    }
    function reveal() {
      if (disposed || video.paused || document.hidden) return;
      revealed = true;
      window.clearTimeout(timer);
      setPlaying(true);
    }
    function firstFrame() {
      if (revealed || disposed) return;
      if (typeof video.requestVideoFrameCallback === "function") {
        if (frame !== undefined) video.cancelVideoFrameCallback(frame);
        frame = video.requestVideoFrameCallback(reveal);
      }
    }
    function fallbackFrame() {
      if (typeof video.requestVideoFrameCallback !== "function" && video.currentTime > 0 && video.readyState >= 2) reveal();
    }
    function visibility() {
      if (document.hidden) video.pause();
      else if (objectUrl && !disposed) void video.play().catch(() => { if (!document.hidden) fail(); });
    }

    video.addEventListener("playing", firstFrame);
    video.addEventListener("timeupdate", fallbackFrame);
    video.addEventListener("error", fail);
    document.addEventListener("visibilitychange", visibility);
    // ponytail: one short 7.42 MB clip in memory; revisit full-file buffering for longer videos.
    void (async () => {
      const response = await fetch(VIDEO, {signal: controller.signal});
      if (!response.ok) throw new Error("Video unavailable");
      const blob = await response.blob();
      if (disposed) return;
      if (!blob.size) throw new Error("Empty video");
      objectUrl = URL.createObjectURL(blob);
      video.src = objectUrl;
      visibility();
    })().catch(fail);

    return cleanup;
  }, [motionEnabled, posterReady]);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
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
          className={`absolute inset-0 size-full object-cover transition-opacity duration-250 motion-reduce:transition-none ${playing ? "opacity-100" : "opacity-0"}`}
          muted
          loop
          playsInline
          preload="none"
        />
      ) : null}
    </div>
  );
}
