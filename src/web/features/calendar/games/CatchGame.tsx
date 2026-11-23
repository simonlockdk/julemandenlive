/** "Fang gaverne": klik/tryk på faldende gaver i 30 sekunder. */
import { useEffect, useRef, useState } from 'react';
import { useStored } from '../../../lib/storage';

interface Gift {
  x: number;
  y: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  caught?: number;
}

const COLORS = ['#d42a45', '#e3b04b', '#23905f', '#7fb2ff', '#c15bd6'];
const DURATION = 30;

export default function CatchGame() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [best, setBest] = useStored('fang-gaverne-rekord', 0);
  const gifts = useRef<Gift[]>([]);
  const scoreRef = useRef(0);

  useEffect(() => {
    if (state !== 'playing') return;
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.clientWidth * dpr;
    c.height = c.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = c.clientWidth;
    const h = c.clientHeight;
    gifts.current = [];
    scoreRef.current = 0;
    const start = performance.now();
    let last = start;
    let spawn = 0;
    let raf = 0;

    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      const elapsed = (ts - start) / 1000;
      const left = Math.max(0, DURATION - elapsed);
      setTimeLeft(Math.ceil(left));
      if (left <= 0) {
        setState('done');
        setBest((b) => Math.max(b, scoreRef.current));
        return;
      }
      spawn -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.35, 0.9 - elapsed * 0.02);
        const size = 26 + Math.random() * 18;
        gifts.current.push({
          x: size + Math.random() * (w - size * 2),
          y: -size,
          vy: 70 + Math.random() * 60 + elapsed * 4,
          size,
          color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 2,
        });
      }
      ctx.clearRect(0, 0, w, h);
      // sne-bund
      ctx.fillStyle = '#e8eef8';
      ctx.fillRect(0, h - 14, w, 14);
      gifts.current = gifts.current.filter((g) => g.y < h + g.size && (g.caught === undefined || ts - g.caught < 400));
      for (const g of gifts.current) {
        if (g.caught === undefined) {
          g.y += g.vy * dt;
          g.rot += g.vr * dt;
        }
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rot);
        const s = g.caught !== undefined ? 1 + (ts - g.caught) / 200 : 1;
        ctx.globalAlpha = g.caught !== undefined ? 1 - (ts - g.caught) / 400 : 1;
        ctx.scale(s, s);
        ctx.fillStyle = g.color;
        ctx.fillRect(-g.size / 2, -g.size / 2, g.size, g.size);
        ctx.fillStyle = '#f7f2e8';
        ctx.fillRect(-2, -g.size / 2, 4, g.size);
        ctx.fillRect(-g.size / 2, -2, g.size, 4);
        ctx.restore();
        if (g.caught !== undefined) {
          ctx.fillStyle = '#f2c96b';
          ctx.font = 'bold 16px Nunito Variable, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+1', g.x, g.y - g.size);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const hit = (ev: PointerEvent) => {
      const r = c.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      for (const g of gifts.current) {
        if (g.caught === undefined && Math.abs(x - g.x) < g.size * 0.8 && Math.abs(y - g.y) < g.size * 0.8) {
          g.caught = performance.now();
          scoreRef.current += 1;
          setScore(scoreRef.current);
          break;
        }
      }
    };
    c.addEventListener('pointerdown', hit);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener('pointerdown', hit);
    };
  }, [state, setBest]);

  return (
    <div className="catch">
      <div className="game-bar">
        <span>Gaver fanget: {score}</span>
        <span>Tid: {timeLeft} s</span>
        <span>Rekord: {best}</span>
      </div>
      <div className="catch-stage">
        <canvas ref={ref} className="catch-canvas" aria-label="Spilleområde: klik på de faldende gaver" />
        {state !== 'playing' && (
          <div className="catch-overlay">
            {state === 'done' && <p className="game-win">Tiden er gået! Du fangede {score} gaver.</p>}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setScore(0);
                setState('playing');
              }}
            >
              {state === 'done' ? 'Spil igen' : 'Start spillet'}
            </button>
          </div>
        )}
      </div>
      <p className="hint-text">Spillet kræver mus eller berøringsskærm. Rekorden gemmes kun på denne enhed.</p>
    </div>
  );
}
