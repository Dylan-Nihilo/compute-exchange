"use client";

import {useEffect, useRef} from "react";

type Particle = {
  alpha: number;
  color: string;
  depth: number;
  homeX: number;
  homeY: number;
  phase: number;
  size: number;
  vx: number;
  vy: number;
  x: number;
  y: number;
};

const cool = ["#1551f5", "#3977ef", "#75a2f2"];
const warm = ["#4d9ba7", "#e09952", "#ed8065"];

function createParticles(width: number, height: number): Particle[] {
  const mobile = width < 768;
  const count = mobile
    ? Math.min(720, Math.round((width * height) / 380))
    : Math.min(2100, Math.round((width * height) / 620));
  const centerX = width * (mobile ? 0.62 : 0.68);
  const centerY = height * (mobile ? 0.69 : 0.51);
  const span = width * (mobile ? 0.72 : 0.46);
  const spread = height * (mobile ? 0.3 : 0.34);

  return Array.from({length: count}, () => {
    const stream = Math.random() < 0.72 ? 0 : 1;
    const t = Math.random() * 2 - 1;
    const taper = 0.28 + 0.72 * (1 - Math.abs(t));
    const thickness = (Math.random() - 0.5) * spread * taper;
    const wave =
      Math.sin(t * Math.PI) * height * (stream === 0 ? 0.15 : -0.12);
    const homeX = centerX + t * span + thickness * (stream === 0 ? 0.32 : -0.18);
    const homeY =
      centerY + wave + thickness + height * (stream === 0 ? -0.018 : 0.032);
    const depth = Math.random();
    const palette = stream === 0 ? cool : warm;

    return {
      alpha: 0.28 + depth * 0.62,
      color: palette[Math.floor(Math.random() * palette.length)],
      depth,
      homeX,
      homeY,
      phase: Math.random() * Math.PI * 2,
      size: 0.65 + depth * 1.55,
      vx: 0,
      vy: 0,
      x: homeX,
      y: homeY,
    };
  }).sort((a, b) => a.depth - b.depth);
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = {active: false, x: 0, y: 0};
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let frame = 0;

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
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
              const force = (1 - distance / radius) ** 2 * (1.5 + particle.depth * 2.4);
              particle.vx += (dx / distance) * force;
              particle.vy += (dy / distance) * force;
            }
          }

          const driftX = Math.sin(time * 0.00018) * width * 0.012;
          const driftY = Math.cos(time * 0.00022) * height * 0.012;
          const waveX =
            Math.cos(time * 0.00042 + particle.homeY * 0.009 + particle.phase * 0.25) *
            (3 + particle.depth * 9);
          const waveY =
            Math.sin(time * 0.00068 + particle.homeX * 0.01 + particle.phase * 0.35) *
            (7 + particle.depth * 17);
          const targetX =
            particle.homeX + driftX * (0.35 + particle.depth * 0.65) + waveX;
          const targetY =
            particle.homeY + driftY * (0.35 + particle.depth * 0.65) + waveY;
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
        context.globalAlpha = particle.alpha * pulse;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * pulse, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      if (!reduceMotion) frame = window.requestAnimationFrame(draw);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = createParticles(width, height);
      if (reduceMotion) draw(0);
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const bounds = canvas.getBoundingClientRect();
      pointer.active = true;
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
    };
    const reset = () => {
      pointer.active = false;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
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
    };
  }, []);

  return <canvas aria-hidden="true" className="particle-field" ref={canvasRef} />;
}
