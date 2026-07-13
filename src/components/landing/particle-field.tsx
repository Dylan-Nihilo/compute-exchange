"use client";

import {memo, useEffect, useRef} from "react";

type Particle = {
  alpha: number;
  color: string;
  depth: number;
  homeX: number;
  homeY: number;
  layer: 0 | 1 | 2;
  phase: number;
  size: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

type FieldPalette = {
  bandSoft: string;
  bandStrong: string;
  contourSoft: string;
  contourStrong: string;
  far: string[];
  mid: string[];
  near: string[];
};

function readFieldPalette(element: Element): FieldPalette {
  const styles = getComputedStyle(element);
  const token = (name: string) =>
    styles.getPropertyValue(name).trim() || styles.color;

  return {
    bandSoft: token("--launch-band-soft"),
    bandStrong: token("--launch-band-strong"),
    contourSoft: token("--launch-contour-soft"),
    contourStrong: token("--launch-contour-strong"),
    far: [
      token("--launch-particle-far-1"),
      token("--launch-particle-far-2"),
      token("--launch-particle-far-3"),
    ],
    mid: [
      token("--launch-particle-mid-1"),
      token("--launch-particle-mid-2"),
      token("--launch-particle-mid-3"),
    ],
    near: [
      token("--launch-particle-near-1"),
      token("--launch-particle-near-2"),
      token("--launch-particle-near-3"),
    ],
  };
}

function streamCurve(t: number, height: number, stream: 0 | 1) {
  const phase = stream === 0 ? -0.08 : 0.66;
  const direction = stream === 0 ? 0.18 : -0.14;

  return (
    Math.sin(t * Math.PI * 0.98 + phase) * height * direction +
    height * (stream === 0 ? -0.028 : 0.045)
  );
}

function createParticles(
  width: number,
  height: number,
  palettes: FieldPalette,
): Particle[] {
  const mobile = width < 768;
  const count = mobile
    ? Math.min(760, Math.round((width * height) / 430))
    : Math.min(1900, Math.round((width * height) / 680));
  const centerX = width * 0.52;
  const centerY = height * (mobile ? 0.59 : 0.53);
  const span = width * (mobile ? 0.78 : 0.66);
  const spread = height * (mobile ? 0.43 : 0.4);

  return Array.from({length: count}, () => {
    const layerRoll = Math.random();
    const layer: Particle["layer"] = layerRoll < 0.22 ? 0 : layerRoll < 0.9 ? 1 : 2;
    const stream: 0 | 1 = Math.random() < 0.76 ? 0 : 1;
    const t = (Math.random() * 2 - 1) * (layer === 0 ? 1.3 : 1.08);
    const taper = 0.22 + 0.78 * (1 - Math.min(1, Math.abs(t)));
    const layerSpread = layer === 0 ? 1.55 : layer === 2 ? 0.82 : 1;
    const thickness = (Math.random() - 0.5) * spread * taper * layerSpread;
    const homeX = centerX + t * span + thickness * (stream === 0 ? 0.28 : -0.2);
    const homeY =
      centerY + streamCurve(t, height, stream) + thickness;
    const depth =
      layer === 0
        ? 0.05 + Math.random() * 0.2
        : layer === 1
          ? 0.3 + Math.random() * 0.46
          : 0.82 + Math.random() * 0.18;
    const palette = layer === 0 ? palettes.far : layer === 1 ? palettes.mid : palettes.near;

    return {
      alpha:
        layer === 0
          ? 0.1 + Math.random() * 0.18
          : layer === 1
            ? 0.3 + Math.random() * 0.42
            : 0.38 + Math.random() * 0.42,
      color: palette[Math.floor(Math.random() * palette.length)],
      depth,
      homeX,
      homeY,
      layer,
      phase: Math.random() * Math.PI * 2,
      size:
        layer === 0
          ? 0.42 + Math.random() * 0.62
          : layer === 1
            ? 0.72 + Math.random() * 1.65
            : 2.25 + Math.random() * 3.5,
      vx: 0,
      vy: 0,
      x: homeX,
      y: homeY,
    };
  }).sort((a, b) => a.depth - b.depth);
}

function drawFieldStructure(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  reduceMotion: boolean,
  palette: FieldPalette,
) {
  const mobile = width < 768;
  const centerX = width * 0.52;
  const centerY = height * (mobile ? 0.59 : 0.53);
  const span = width * (mobile ? 0.78 : 0.66);
  const phase = reduceMotion ? 0 : time * 0.0002;
  const samples = 72;

  const point = (index: number, stream: 0 | 1, offset: number) => {
    const t = -1.3 + (index / samples) * 2.6;
    const taper = 0.28 + 0.72 * (1 - Math.min(1, Math.abs(t)));
    const x = centerX + t * span;
    const y =
      centerY +
      streamCurve(t, height, stream) +
      Math.sin(t * 4.8 + phase * (stream === 0 ? 2.2 : -1.65)) * height * 0.012 +
      offset * taper;

    return {x, y};
  };

  const drawBand = (stream: 0 | 1, halfWidth: number, fill: string) => {
    context.beginPath();
    for (let index = 0; index <= samples; index += 1) {
      const {x, y} = point(index, stream, -halfWidth);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    for (let index = samples; index >= 0; index -= 1) {
      const {x, y} = point(index, stream, halfWidth);
      context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = fill;
    context.fill();
  };

  context.save();
  context.globalCompositeOperation = "multiply";
  drawBand(0, height * 0.115, palette.bandStrong);
  drawBand(1, height * 0.07, palette.bandSoft);

  const contours = [-0.2, -0.12, -0.055, 0, 0.065, 0.14, 0.22];
  for (const contour of contours) {
    context.beginPath();
    for (let index = 0; index <= samples; index += 1) {
      const {x, y} = point(index, 0, contour * height);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.globalAlpha = contour === 0 ? 0.26 : 0.12;
    context.lineWidth = contour === 0 ? 1.15 : 0.8;
    context.strokeStyle = palette.contourStrong;
    context.stroke();
  }

  for (const contour of [-0.09, 0, 0.09]) {
    context.beginPath();
    for (let index = 0; index <= samples; index += 1) {
      const {x, y} = point(index, 1, contour * height);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.globalAlpha = contour === 0 ? 0.18 : 0.08;
    context.lineWidth = 0.75;
    context.strokeStyle = palette.contourSoft;
    context.stroke();
  }
  context.restore();
}

export const ParticleField = memo(function ParticleField() {
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const backCanvas = backCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;
    if (!backCanvas || !frontCanvas) return;

    const backContext = backCanvas.getContext("2d");
    const frontContext = frontCanvas.getContext("2d");
    if (!backContext || !frontContext) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const page = backCanvas.parentElement;
    const palette = readFieldPalette(page ?? document.documentElement);
    const pointer = {active: false, x: 0, y: 0};
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let parallaxX = 0;
    let parallaxY = 0;

    const draw = (time: number) => {
      backContext.clearRect(0, 0, width, height);
      frontContext.clearRect(0, 0, width, height);
      drawFieldStructure(
        backContext,
        width,
        height,
        time,
        reduceMotion,
        palette,
      );

      const radius = Math.min(155, Math.max(86, width * 0.085));
      const radiusSquared = radius * radius;

      for (const particle of particles) {
        if (!reduceMotion) {
          if (pointer.active) {
            const dx = particle.x - pointer.x;
            const dy = particle.y - pointer.y;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared < radiusSquared) {
              const distance = Math.sqrt(distanceSquared) || 1;
              const force = (1 - distance / radius) ** 2 * (1.1 + particle.depth * 3.6);
              particle.vx += (dx / distance) * force;
              particle.vy += (dy / distance) * force;
            }
          }

          const layerSpeed = particle.layer === 0 ? 0.25 : particle.layer === 1 ? 1 : 2.4;
          const driftX = Math.sin(time * 0.00018 * layerSpeed) * width * 0.014;
          const driftY = Math.cos(time * 0.00022 * layerSpeed) * height * 0.014;
          const waveX =
            Math.cos(
              time * 0.00042 * layerSpeed +
                particle.homeY * 0.009 +
                particle.phase * 0.25,
            ) *
            (2 + particle.depth * 12);
          const waveY =
            Math.sin(
              time * 0.00068 * layerSpeed +
                particle.homeX * 0.01 +
                particle.phase * 0.35,
            ) *
            (5 + particle.depth * 22);
          const flowPhase = time * 0.00072 * layerSpeed + particle.phase;
          const flowX = Math.sin(flowPhase) * (6 + particle.depth * 34);
          const flowY = Math.cos(flowPhase * 0.72) * (2 + particle.depth * 11);
          const targetX =
            particle.homeX +
            driftX * (0.35 + particle.depth * 0.65) +
            waveX +
            flowX;
          const targetY =
            particle.homeY +
            driftY * (0.35 + particle.depth * 0.65) +
            waveY +
            flowY;
          particle.vx += (targetX - particle.x) * 0.022;
          particle.vy += (targetY - particle.y) * 0.022;
          particle.vx *= 0.88;
          particle.vy *= 0.88;
          particle.x += particle.vx;
          particle.y += particle.vy;
        }

        const pulse = reduceMotion
          ? 1
          : 0.9 + Math.sin(time * 0.0011 + particle.phase) * 0.14;
        const context = particle.layer === 2 ? frontContext : backContext;
        context.globalAlpha = particle.alpha * pulse;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * pulse, 0, Math.PI * 2);
        context.fill();
      }

      backContext.globalAlpha = 1;
      frontContext.globalAlpha = 1;

      if (!reduceMotion && page) {
        const targetX = pointer.active ? (pointer.x / width - 0.5) * 12 : 0;
        const targetY = pointer.active ? (pointer.y / height - 0.5) * 9 : 0;
        parallaxX += (targetX - parallaxX) * 0.075;
        parallaxY += (targetY - parallaxY) * 0.075;
        const fieldX = Math.sin(time * 0.0002) * 2.8;
        const fieldY = Math.cos(time * 0.00017) * 1.8;
        page.style.setProperty("--build-x", `${-parallaxX * 0.55 - fieldX * 0.3}px`);
        page.style.setProperty("--build-y", `${-parallaxY * 0.55 - fieldY * 0.3}px`);
        page.style.setProperty("--future-x", `${parallaxX + fieldX}px`);
        page.style.setProperty("--future-y", `${parallaxY + fieldY}px`);
      }

      if (!reduceMotion) frame = window.requestAnimationFrame(draw);
    };

    const resize = () => {
      const bounds = backCanvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;

      for (const [canvas, context] of [
        [backCanvas, backContext],
        [frontCanvas, frontContext],
      ] as const) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
      }

      particles = createParticles(width, height, palette);
      if (reduceMotion) draw(0);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = backCanvas.getBoundingClientRect();
      pointer.active = true;
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
    };
    const reset = () => {
      pointer.active = false;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(backCanvas);
    window.addEventListener("pointermove", move, {passive: true});
    window.addEventListener("blur", reset);
    document.documentElement.addEventListener("mouseleave", reset);
    resize();
    if (!reduceMotion) frame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("blur", reset);
      document.documentElement.removeEventListener("mouseleave", reset);
      page?.style.removeProperty("--build-x");
      page?.style.removeProperty("--build-y");
      page?.style.removeProperty("--future-x");
      page?.style.removeProperty("--future-y");
    };
  }, []);

  return (
    <>
      <canvas
        aria-hidden="true"
        className="particle-field particle-field--back"
        ref={backCanvasRef}
      />
      <canvas
        aria-hidden="true"
        className="particle-field particle-field--front"
        ref={frontCanvasRef}
      />
    </>
  );
});
