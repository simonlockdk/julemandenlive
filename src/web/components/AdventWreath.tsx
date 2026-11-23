/**
 * Animeret adventskrans. Antallet af tændte lys følger kalenderen
 * (adventState). Klik på et lys giver en lille animation, men ændrer
 * aldrig den automatiske status.
 */
import { useMemo, useState } from 'react';
import { useNow } from '../lib/app-context';
import { adventState, type SimpleDate } from '@shared/season';
import { mulberry32 } from '@shared/rng';
import { HiddenNisse } from './HiddenNisse';
import { IconFlame } from './Icons';
import './advent.css';

const CX = 200;
const CY = 182;
const RX = 148;
const RY = 50;
// Lysenes placering (vinkel i grader på ellipsen). Rækkefølge = tænd-rækkefølge.
const CANDLE_ANGLES = [115, 205, 295, 25];
const MONTHS = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const fmtD = (d: SimpleDate) => `${d.day}. ${MONTHS[d.month - 1]}`;

interface Needle {
  x: number;
  y: number;
  rot: number;
  len: number;
  color: string;
  back: boolean;
}

function useGreenery() {
  return useMemo(() => {
    const r = mulberry32(2412);
    const greens = ['#0f4d36', '#17694a', '#1d7a55', '#0a3b2a', '#23905f', '#13573f'];
    const needles: Needle[] = [];
    for (let i = 0; i < 420; i++) {
      const a = r() * Math.PI * 2;
      const spread = (r() - 0.5) * 2;
      const rr = 1 + spread * 0.17;
      const x = CX + Math.cos(a) * RX * rr;
      const y = CY + Math.sin(a) * RY * rr - r() * 16;
      const tangent = (Math.atan2(Math.cos(a) * RY, -Math.sin(a) * RX) * 180) / Math.PI;
      needles.push({
        x,
        y,
        rot: tangent + (r() - 0.5) * 70,
        len: 9 + r() * 12,
        color: greens[Math.floor(r() * greens.length)]!,
        back: Math.sin(a) < 0.05,
      });
    }
    const berries = Array.from({ length: 26 }, () => {
      const a = r() * Math.PI * 2;
      return {
        x: CX + Math.cos(a) * RX * (0.92 + r() * 0.16),
        y: CY + Math.sin(a) * RY * (0.9 + r() * 0.2) - 8 - r() * 6,
        r: 3 + r() * 2.2,
        back: Math.sin(a) < 0,
      };
    });
    const cones = Array.from({ length: 6 }, (_, i) => {
      const a = ((i + 0.5) / 6) * Math.PI * 2;
      return { x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY - 6, back: Math.sin(a) < 0 };
    });
    return { needles, berries, cones };
  }, []);
}

function Greenery({ back }: { back: boolean }) {
  const { needles, berries, cones } = useGreenery();
  return (
    <g>
      {needles
        .filter((n) => n.back === back)
        .map((n, i) => (
          <ellipse key={i} cx={n.x} cy={n.y} rx={n.len} ry={2.3} fill={n.color} transform={`rotate(${n.rot} ${n.x} ${n.y})`} />
        ))}
      {cones
        .filter((c) => c.back === back)
        .map((c, i) => (
          <g key={i} transform={`translate(${c.x} ${c.y})`}>
            <ellipse rx="8" ry="11" fill="#6b4a2b" />
            <path d="M-6 -4h12M-7 1h14M-6 6h12" stroke="#3d2a18" strokeWidth="1.2" />
          </g>
        ))}
      {berries
        .filter((b) => b.back === back)
        .map((b, i) => (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={b.r} fill="#c8273f" />
            <circle cx={b.x - b.r * 0.35} cy={b.y - b.r * 0.35} r={b.r * 0.32} fill="#ffb3bd" opacity=".7" />
          </g>
        ))}
    </g>
  );
}

interface CandleProps {
  index: number;
  lit: boolean;
  height: number;
  onClick: () => void;
  effect: 'sparkle' | 'smoke' | null;
}

function Candle({ index, lit, height, onClick, effect }: CandleProps) {
  const a = (CANDLE_ANGLES[index]! * Math.PI) / 180;
  const x = CX + Math.cos(a) * RX * 0.98;
  const baseY = CY + Math.sin(a) * RY * 0.98 - 4;
  const w = 26;
  const top = baseY - height;
  return (
    <g
      className="candle"
      data-lit={lit}
      onClick={onClick}
      style={{ ['--delay' as string]: `${index * -0.37}s` }}
    >
      <rect x={x - w / 2} y={top} width={w} height={height} rx="4" fill="url(#candle-red)" />
      <rect x={x - w / 2 + 4} y={top + 6} width="4" height={height - 12} rx="2" fill="#fff" opacity=".18" />
      <ellipse cx={x} cy={top + 1} rx={w / 2} ry="4.5" fill="#e0405a" />
      <ellipse cx={x} cy={top + 1} rx={w / 2 - 3} ry="3" fill={lit ? '#f6a1ab' : '#c8273f'} />
      {lit && <path d={`M${x - w / 2 + 2} ${top + 2} q2 9 5 10 q2 -1 2 -9z`} fill="#e0405a" />}
      <path d={`M${x} ${top + 20} l2.5 5 5.5 .6 -4 3.8 1 5.4 -5 -2.6 -5 2.6 1 -5.4 -4 -3.8 5.5 -.6z`} fill="#f2c96b" opacity=".9" />
      <line x1={x} y1={top} x2={x} y2={top - 8} stroke="#2b1a12" strokeWidth="1.6" strokeLinecap="round" />
      {lit && (
        <g className="flame-wrap" style={{ transformOrigin: `${x}px ${top - 6}px` }}>
          <circle cx={x} cy={top - 18} r="26" fill="url(#flame-glow)" className="flame-glow" />
          <path
            className="flame"
            style={{ transformOrigin: `${x}px ${top - 6}px` }}
            d={`M${x} ${top - 34} C${x + 9} ${top - 20}, ${x + 8} ${top - 8}, ${x} ${top - 5} C${x - 8} ${top - 8}, ${x - 9} ${top - 20}, ${x} ${top - 34}z`}
            fill="url(#flame-grad)"
          />
          <ellipse cx={x} cy={top - 10} rx="2.6" ry="4" fill="#7fb2ff" opacity=".7" />
        </g>
      )}
      {effect === 'sparkle' && (
        <g className="sparkles">
          {Array.from({ length: 8 }, (_, i) => (
            <circle key={i} cx={x} cy={top - 20} r="2.2" fill="#fff6d8" style={{ ['--a' as string]: `${i * 45}deg` }} />
          ))}
        </g>
      )}
      {effect === 'smoke' && (
        <g className="smoke">
          <circle cx={x} cy={top - 10} r="4" fill="#c9cfdc" />
          <circle cx={x + 3} cy={top - 18} r="5" fill="#c9cfdc" />
        </g>
      )}
      <rect x={x - 22} y={top - 44} width="44" height={height + 50} fill="transparent" />
    </g>
  );
}

export function AdventWreath() {
  const now = useNow(60_000);
  const st = adventState(now);
  const [effect, setEffect] = useState<{ i: number; kind: 'sparkle' | 'smoke' } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const click = (i: number) => {
    const lit = i < st.lit;
    setEffect({ i, kind: lit ? 'sparkle' : 'smoke' });
    window.setTimeout(() => setEffect(null), 1300);
    const sunday = st.sundays[i];
    setNote(
      lit
        ? `${i + 1}. lys blev tændt ${sunday ? fmtD(sunday) : ''}. Det brænder så fint!`
        : sunday
          ? `Dette lys tændes ${i + 1}. søndag i advent – ${fmtD(sunday)}.`
          : 'Dette lys venter på næste års advent.',
    );
  };

  return (
    <section className="panel advent" aria-labelledby="advent-titel">
      <div className="panel-head">
        <h2 id="advent-titel">
          <IconFlame className="icon" /> Adventskransen
        </h2>
        <span className="tag tag-ok">
          {st.lit} af 4 lys
        </span>
      </div>
      <HiddenNisse id="krans" style={{ right: 18, top: 120 }} />
      <svg viewBox="0 0 400 260" className="wreath-svg" role="img" aria-label={`Adventskrans med ${st.lit} af fire lys tændt`}>
        <defs>
          <linearGradient id="candle-red" x1="0" x2="1">
            <stop offset="0" stopColor="#8e0f25" />
            <stop offset=".45" stopColor="#d42a45" />
            <stop offset="1" stopColor="#8e0f25" />
          </linearGradient>
          <radialGradient id="flame-grad" cx="50%" cy="70%" r="60%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".35" stopColor="#fff2b0" />
            <stop offset=".75" stopColor="#ffb547" />
            <stop offset="1" stopColor="#ff6a2a" />
          </radialGradient>
          <radialGradient id="flame-glow">
            <stop offset="0" stopColor="#ffd98a" stopOpacity=".55" />
            <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="table-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity=".5" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx={CX} cy={CY + 28} rx="190" ry="42" fill="url(#table-glow)" opacity={0.15 + st.lit * 0.18} />
        <ellipse cx={CX} cy={CY + 14} rx="172" ry="44" fill="#030712" opacity=".55" />
        <Greenery back />
        {[0, 1, 2, 3]
          .filter((i) => Math.sin((CANDLE_ANGLES[i]! * Math.PI) / 180) < 0)
          .map((i) => (
            <Candle key={i} index={i} lit={i < st.lit} height={i < st.lit ? 92 - (st.lit - 1 - i) * 13 : 96} onClick={() => click(i)} effect={effect?.i === i ? effect.kind : null} />
          ))}
        <Greenery back={false} />
        {[0, 1, 2, 3]
          .filter((i) => Math.sin((CANDLE_ANGLES[i]! * Math.PI) / 180) >= 0)
          .map((i) => (
            <Candle key={i} index={i} lit={i < st.lit} height={i < st.lit ? 92 - (st.lit - 1 - i) * 13 : 96} onClick={() => click(i)} effect={effect?.i === i ? effect.kind : null} />
          ))}
        {/* sløjfe */}
        <g transform={`translate(${CX} ${CY + RY - 6})`}>
          <path d="M0 0 C-30 -18 -38 8 -6 4z M0 0 C30 -18 38 8 6 4z" fill="#e3b04b" stroke="#b9852b" strokeWidth="1" />
          <path d="M-4 3 L-14 26 L-6 22 L-2 28z M4 3 L14 26 L6 22 L2 28z" fill="#d49a35" />
          <circle r="5" fill="#f2c96b" />
        </g>
      </svg>
      <div className="advent-buttons" role="group" aria-label="Adventslys">
        {[0, 1, 2, 3].map((i) => (
          <button key={i} type="button" className="btn btn-small" onClick={() => click(i)} aria-label={`Lys nummer ${i + 1}, ${i < st.lit ? 'tændt' : 'slukket'}`}>
            {i + 1}. {i < st.lit ? 'tændt' : 'slukket'}
          </button>
        ))}
      </div>
      <p className="advent-msg" aria-live="polite">
        {note ?? st.message}
      </p>
      {st.next && !note && <p className="advent-next">Næste lys tændes søndag {fmtD(st.next)}.</p>}
    </section>
  );
}
