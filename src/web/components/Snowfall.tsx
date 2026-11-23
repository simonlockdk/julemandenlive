/**
 * Diskret, let sne. Tegnes på ét canvas med lav billedfrekvens, pauser når
 * fanen er skjult, og vises slet ikke ved prefers-reduced-motion.
 */
import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/hooks';

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  phase: number;
  a: number;
}

export function Snowfall({ intensity = 1 }: { intensity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const make = (randomY: boolean): Flake => {
      const r = Math.random() ** 2 * 2.4 + 0.6;
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : -5,
        r,
        vy: 12 + r * 14,
        vx: (Math.random() - 0.5) * 6,
        phase: Math.random() * Math.PI * 2,
        a: 0.35 + Math.random() * 0.5,
      };
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(110, (w * h) / 22000) * intensity);
      flakes = Array.from({ length: target }, () => make(true));
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const frameMs = 1000 / 30;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = t - last;
      last = t;
      acc += dt;
      if (acc < frameMs) return;
      const step = Math.min(acc, 100) / 1000;
      acc = 0;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      for (const f of flakes) {
        f.phase += step * 1.2;
        f.y += f.vy * step;
        f.x += (f.vx + Math.sin(f.phase) * 8) * step;
        if (f.y > h + 5 || f.x < -10 || f.x > w + 10) Object.assign(f, make(false));
        ctx.globalAlpha = f.a;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduced, intensity]);

  if (reduced) return null;
  return <canvas ref={ref} className="snow-canvas" aria-hidden="true" />;
}
