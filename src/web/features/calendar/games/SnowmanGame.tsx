/** Byg en snemand: vælg hat, næse, tørklæde og knapper. */
import { useStored } from '../../../lib/storage';

const HATS = ['ingen', 'høj hat', 'nissehue', 'uldhue'] as const;
const NOSES = ['gulerod', 'kul', 'rødbede'] as const;
const SCARVES = ['#d42a45', '#23905f', '#7fb2ff', '#e3b04b'] as const;
const ARMS = ['grene', 'ingen'] as const;

interface Snowman {
  hat: (typeof HATS)[number];
  nose: (typeof NOSES)[number];
  scarf: string;
  arms: (typeof ARMS)[number];
  buttons: number;
}

const DEFAULT: Snowman = { hat: 'høj hat', nose: 'gulerod', scarf: '#d42a45', arms: 'grene', buttons: 3 };

export default function SnowmanGame() {
  const [s, setS] = useStored<Snowman>('min-snemand', DEFAULT);
  const set = <K extends keyof Snowman>(k: K, v: Snowman[K]) => setS((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="snowman">
      <svg viewBox="0 0 200 240" className="snowman-svg" role="img" aria-label={`Snemand med ${s.hat}, ${s.nose}næse og ${s.buttons} knapper`}>
        <ellipse cx="100" cy="228" rx="90" ry="10" fill="#c9d6ea" />
        {s.arms === 'grene' && (
          <g stroke="#6b4a2b" strokeWidth="3" strokeLinecap="round">
            <path d="M65 130 L25 105 M38 113 L30 98" />
            <path d="M135 130 L175 100 M162 108 L172 92" />
          </g>
        )}
        <circle cx="100" cy="185" r="45" fill="#f4f7fb" stroke="#c9d6ea" strokeWidth="2" />
        <circle cx="100" cy="122" r="34" fill="#f4f7fb" stroke="#c9d6ea" strokeWidth="2" />
        <circle cx="100" cy="70" r="26" fill="#f4f7fb" stroke="#c9d6ea" strokeWidth="2" />
        {Array.from({ length: s.buttons }, (_, i) => (
          <circle key={i} cx="100" cy={108 + i * 14} r="3.6" fill="#1b1410" />
        ))}
        <circle cx="91" cy="64" r="3" fill="#1b1410" />
        <circle cx="109" cy="64" r="3" fill="#1b1410" />
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={88 + i * 6} cy={80 + Math.sin((i / 4) * Math.PI) * 4} r="1.8" fill="#1b1410" />
        ))}
        {s.nose === 'gulerod' && <path d="M100 70 L124 74 L100 76z" fill="#ff8a3d" />}
        {s.nose === 'kul' && <circle cx="100" cy="72" r="4" fill="#1b1410" />}
        {s.nose === 'rødbede' && <circle cx="100" cy="72" r="5" fill="#8e0f25" />}
        <path d="M74 92 Q100 104 126 92 L126 100 Q100 112 74 100z" fill={s.scarf} />
        <path d="M112 100 L118 128 L108 128 L104 102z" fill={s.scarf} />
        {s.hat === 'høj hat' && (
          <g fill="#1b1410">
            <rect x="72" y="44" width="56" height="6" rx="2" />
            <rect x="82" y="14" width="36" height="32" rx="2" />
            <rect x="82" y="38" width="36" height="5" fill="#d42a45" />
          </g>
        )}
        {s.hat === 'nissehue' && (
          <g>
            <path d="M74 52 Q90 4 132 22 Q112 24 126 52z" fill="#d42a45" />
            <rect x="72" y="48" width="56" height="8" rx="4" fill="#f7f2e8" />
            <circle cx="132" cy="22" r="6" fill="#f7f2e8" />
          </g>
        )}
        {s.hat === 'uldhue' && (
          <g>
            <path d="M75 52 Q100 14 125 52z" fill="#23905f" />
            <rect x="74" y="48" width="52" height="8" rx="4" fill="#e3b04b" />
            <circle cx="100" cy="24" r="6" fill="#e3b04b" />
          </g>
        )}
      </svg>
      <div className="snowman-controls">
        <fieldset>
          <legend>Hat</legend>
          {HATS.map((h) => (
            <button key={h} type="button" className="btn btn-small" aria-pressed={s.hat === h} onClick={() => set('hat', h)}>
              {h}
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>Næse</legend>
          {NOSES.map((n) => (
            <button key={n} type="button" className="btn btn-small" aria-pressed={s.nose === n} onClick={() => set('nose', n)}>
              {n}
            </button>
          ))}
        </fieldset>
        <fieldset>
          <legend>Tørklæde</legend>
          {SCARVES.map((c) => (
            <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={s.scarf === c} aria-label={`Tørklædefarve ${c}`} onClick={() => set('scarf', c)} />
          ))}
        </fieldset>
        <fieldset>
          <legend>Arme og knapper</legend>
          {ARMS.map((a) => (
            <button key={a} type="button" className="btn btn-small" aria-pressed={s.arms === a} onClick={() => set('arms', a)}>
              {a}
            </button>
          ))}
          <button type="button" className="btn btn-small" onClick={() => set('buttons', (s.buttons % 5) + 1)}>
            Knapper: {s.buttons}
          </button>
        </fieldset>
        <p className="hint-text">Din snemand bliver gemt på denne enhed, så den står klar næste gang.</p>
      </div>
    </div>
  );
}
