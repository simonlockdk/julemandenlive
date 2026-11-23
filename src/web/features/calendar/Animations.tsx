/** Små animationer bag kalenderlågerne. Respekterer reduceret bevægelse. */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../lib/hooks';
import { NisseFigure } from '../../components/Art';

function useCanvasLoop(draw: (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void, deps: unknown[] = []) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      c.width = c.clientWidth * dpr;
      c.height = c.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    let raf = 0;
    const start = performance.now();
    const loop = (ts: number) => {
      draw(ctx, (ts - start) / 1000, c.clientWidth, c.clientHeight);
      if (!reduced) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);
  return ref;
}

/* ---------------- snekugle ---------------- */

export function Snowglobe() {
  const flakes = useRef(
    Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), vx: 0, vy: 0, r: 0.8 + Math.random() * 1.8 })),
  );
  const [shaking, setShaking] = useState(false);
  const shake = () => {
    for (const f of flakes.current) {
      f.vx = (Math.random() - 0.5) * 0.04;
      f.vy = -Math.random() * 0.05;
    }
    setShaking(true);
    window.setTimeout(() => setShaking(false), 600);
  };
  const ref = useCanvasLoop((ctx, _t, w, h) => {
    const cx = w / 2;
    const cy = h / 2 - 10;
    const R = Math.min(w, h) * 0.42;
    ctx.clearRect(0, 0, w, h);
    // fod
    ctx.fillStyle = '#6b3a1f';
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.75, cy + R * 0.8);
    ctx.lineTo(cx + R * 0.75, cy + R * 0.8);
    ctx.lineTo(cx + R * 0.9, cy + R * 1.12);
    ctx.lineTo(cx - R * 0.9, cy + R * 1.12);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    const g = ctx.createRadialGradient(cx, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, '#234179');
    g.addColorStop(1, '#0a1530');
    ctx.fillStyle = g;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    // lille hus + træ
    ctx.fillStyle = '#e8eef8';
    ctx.fillRect(cx - R, cy + R * 0.45, R * 2, R);
    ctx.fillStyle = '#b3122e';
    ctx.fillRect(cx - R * 0.35, cy + R * 0.05, R * 0.4, R * 0.42);
    ctx.fillStyle = '#f7f2e8';
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.42, cy + R * 0.07);
    ctx.lineTo(cx - R * 0.15, cy - R * 0.2);
    ctx.lineTo(cx + R * 0.12, cy + R * 0.07);
    ctx.fill();
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(cx - R * 0.25, cy + R * 0.18, R * 0.1, R * 0.1);
    ctx.fillStyle = '#17694a';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + R * 0.3, cy + R * (0.45 - i * 0.18));
      ctx.lineTo(cx + R * (0.5 - i * 0.04), cy + R * (0.15 - i * 0.18));
      ctx.lineTo(cx + R * (0.7 - i * 0.08), cy + R * (0.45 - i * 0.18));
      ctx.fill();
    }
    // sne
    ctx.fillStyle = '#fff';
    for (const f of flakes.current) {
      f.vy += 0.0004;
      f.vx *= 0.985;
      f.vy *= 0.985;
      f.vy = Math.min(f.vy, 0.0035);
      f.x += f.vx;
      f.y += f.vy;
      if (f.x < 0 || f.x > 1) f.vx *= -1;
      if (f.y > 0.95) {
        f.y = 0.95;
        f.vy = 0;
      }
      if (f.y < 0.02) f.vy = Math.abs(f.vy);
      ctx.beginPath();
      ctx.arc(cx - R + f.x * R * 2, cy - R + f.y * R * 2, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // glas-glans
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI * 1.1, Math.PI * 1.45);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242,201,107,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
  });
  return (
    <div className="anim-box">
      <canvas ref={ref} className={`anim-canvas${shaking ? ' shaking' : ''}`} aria-label="Snekugle med et lille hus og et juletræ" role="img" />
      <button type="button" className="btn btn-gold" onClick={shake}>
        Ryst snekuglen
      </button>
    </div>
  );
}

/* ---------------- fyrværkeri / stjerneregn ---------------- */

export function Fireworks() {
  const parts = useRef<{ x: number; y: number; vx: number; vy: number; life: number; c: string }[]>([]);
  const ref = useCanvasLoop((ctx, t, w, h) => {
    ctx.fillStyle = 'rgba(5,11,26,0.25)';
    ctx.fillRect(0, 0, w, h);
    if (Math.random() < 0.04 || parts.current.length === 0) {
      const x = w * (0.2 + Math.random() * 0.6);
      const y = h * (0.2 + Math.random() * 0.35);
      const colors = ['#f2c96b', '#ec5b6f', '#4cc28a', '#7fb2ff', '#fff6d8'];
      const c = colors[Math.floor(Math.random() * colors.length)]!;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const v = 1 + Math.random() * 2.2;
        parts.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c });
      }
    }
    parts.current = parts.current.filter((p) => p.life > 0);
    for (const p of parts.current) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.03;
      p.vx *= 0.985;
      p.life -= 0.012;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f7f2e8';
    ctx.font = `600 ${Math.max(18, w / 18)}px Fraunces Variable, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Glædelig jul!', w / 2, h - 24 + Math.sin(t * 2) * 3);
  });
  return (
    <div className="anim-box">
      <canvas ref={ref} className="anim-canvas dark" role="img" aria-label="Stjerneregn med teksten Glædelig jul" />
    </div>
  );
}

/* ---------------- nordlys ---------------- */

export function Aurora() {
  return (
    <div className="anim-box">
      <div className="aurora-show" role="img" aria-label="Grønt og lilla nordlys danser over sneklædte fjelde">
        <div className="ab ab1" />
        <div className="ab ab2" />
        <div className="ab ab3" />
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="aurora-hills" aria-hidden="true">
          <path d="M0 120 L0 70 L60 40 L110 75 L170 30 L240 80 L300 45 L400 85 L400 120z" fill="#c9d6ea" />
          <path d="M0 120 L0 95 L80 80 L160 100 L260 85 L400 100 L400 120z" fill="#e8eef8" />
        </svg>
      </div>
    </div>
  );
}

/* ---------------- dansende nisser ---------------- */

export function NisseDance() {
  return (
    <div className="anim-box">
      <div className="nisse-dance" role="img" aria-label="Nisser danser om juletræet">
        <svg viewBox="0 0 60 90" className="dance-tree" aria-hidden="true">
          <path d="M30 4 L52 40 L42 40 L56 64 L4 64 L18 40 L8 40z" fill="#17694a" />
          <rect x="26" y="64" width="8" height="10" fill="#6b4a2b" />
          <path d="M30 0l2 4 4 .5-3 2.6 1 4-4-2-4 2 1-4-3-2.6 4-.5z" fill="#f2c96b" />
        </svg>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="dancer" style={{ ['--i' as string]: i }}>
            <NisseFigure variant={i} />
          </div>
        ))}
      </div>
    </div>
  );
}
