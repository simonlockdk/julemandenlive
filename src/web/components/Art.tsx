/** Små, originale illustrationer i SVG. */
import type { SVGProps } from 'react';

export function Emblem(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <defs>
        <radialGradient id="em-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#234179" />
          <stop offset="1" stopColor="#050b1a" />
        </radialGradient>
        <linearGradient id="em-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8dfa0" />
          <stop offset="1" stopColor="#d49a35" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#em-bg)" stroke="url(#em-gold)" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#f2c96b" strokeOpacity=".35" strokeDasharray="2 3.2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line
          key={i}
          x1="32"
          y1="5.5"
          x2="32"
          y2={i % 3 === 0 ? 10.5 : 8.5}
          stroke="#f2c96b"
          strokeWidth={i % 3 === 0 ? 2 : 1.2}
          transform={`rotate(${i * 30} 32 32)`}
        />
      ))}
      <path d="M32 12l4.6 15.4L52 32l-15.4 4.6L32 52l-4.6-15.4L12 32l15.4-4.6z" fill="url(#em-gold)" />
      <path d="M32 12l4.6 15.4L32 32zM52 32l-15.4 4.6L32 32zM32 52l-4.6-15.4L32 32zM12 32l15.4-4.6L32 32z" fill="#b9852b" opacity=".55" />
      <circle cx="32" cy="32" r="4" fill="#d42a45" stroke="#f8dfa0" strokeWidth="1" />
    </svg>
  );
}

/** Lille nisse med rød hue – bruges som skjult nisse, ikoner og i toasts. */
export function NisseFigure({ variant = 0, ...props }: SVGProps<SVGSVGElement> & { variant?: number }) {
  const hats = ['#d42a45', '#b3122e', '#c8273f', '#e0405a'];
  const coats = ['#17694a', '#0f4d36', '#8e0f25', '#23905f'];
  const hat = hats[variant % hats.length];
  const coat = coats[(variant + 1) % coats.length];
  return (
    <svg viewBox="0 0 40 46" aria-hidden="true" {...props}>
      <path d="M8 22C9 10 17 2 31 4c-3 2-4 5-5 8l2 10z" fill={hat} />
      <circle cx="31" cy="4.5" r="3.4" fill="#f7f2e8" />
      <rect x="6.5" y="20" width="23" height="5" rx="2.5" fill="#f7f2e8" />
      <circle cx="18" cy="29" r="7.5" fill="#f3c6a5" />
      <circle cx="15" cy="28" r="1.1" fill="#2b1a12" />
      <circle cx="21" cy="28" r="1.1" fill="#2b1a12" />
      <circle cx="18" cy="31" r="1.6" fill="#e48d84" />
      <path d="M11 31c1 7 4 10 7 10s6-3 7-10c-2 2-4 2.5-7 2.5S13 33 11 31z" fill="#f7f2e8" />
      <path d="M9 44c0-4 4-6 9-6s9 2 9 6z" fill={coat} />
    </svg>
  );
}

/** Julemandens kane med to rensdyr – set fra siden (kører mod højre). */
export function SleighArt({ glow = true, ...props }: SVGProps<SVGSVGElement> & { glow?: boolean }) {
  return (
    <svg viewBox="0 0 120 52" aria-hidden="true" {...props}>
      <defs>
        <linearGradient id="sl-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ec5b6f" />
          <stop offset="1" stopColor="#8e0f25" />
        </linearGradient>
        <radialGradient id="sl-nose" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff2c2" />
          <stop offset=".4" stopColor="#ff5a5a" />
          <stop offset="1" stopColor="#ff5a5a" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* seletøj */}
      <path d="M40 30 C55 27, 70 26, 86 22" stroke="#e3b04b" strokeWidth="1.4" fill="none" />
      <path d="M40 33 C55 31, 70 31, 98 26" stroke="#e3b04b" strokeWidth="1.2" fill="none" opacity=".8" />
      {/* rensdyr bagerst */}
      <g className="deer deer-a">
        <ellipse cx="78" cy="27" rx="9" ry="4.6" fill="#8a5a3b" />
        <path d="M71 29l-3 7M74 30l-1 7M83 29l2 7M85 28l4 6" stroke="#5d3a24" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M86 24c2-3 4-4 6-4l1 3c-2 1-3 2-5 3z" fill="#8a5a3b" />
        <path d="M91 19c-1-3 0-5 2-6M92 20c1-3 3-4 5-4M93 15l2-1" stroke="#d9b98a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </g>
      {/* Rudolf forrest med rød næse */}
      <g className="deer deer-b">
        <ellipse cx="98" cy="22.5" rx="9" ry="4.6" fill="#9a6644" />
        <path d="M91 24l-3 7M94 25l-1 7M103 24l2 7M105 23l4 6" stroke="#5d3a24" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M106 19.5c2-3 4-4 6-4l1 3c-2 1-3 2-5 3z" fill="#9a6644" />
        <path d="M111 14.5c-1-3 0-5 2-6M112 15.5c1-3 3-4 5-4M113 10.5l2-1" stroke="#e8cfa6" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        {glow && <circle cx="114.5" cy="18.5" r="5" fill="url(#sl-nose)" className="nose-glow" />}
        <circle cx="114" cy="18.5" r="1.4" fill="#ff4d4d" />
      </g>
      {/* kane */}
      <path d="M6 36c-2-8 2-16 10-17h16c4 0 7 3 8 7l2 10z" fill="url(#sl-red)" stroke="#f2c96b" strokeWidth="1.2" />
      <path d="M12 23c2-2 5-3 8-3" stroke="#f8dfa0" strokeWidth="1" fill="none" opacity=".7" />
      {/* gavesæk */}
      <path d="M12 21c-1-6 3-11 9-11s9 5 8 11z" fill="#6b4a2b" />
      <rect x="14" y="13" width="5" height="5" rx="1" fill="#17694a" transform="rotate(-12 16 15)" />
      <rect x="21" y="11" width="5" height="6" rx="1" fill="#e3b04b" transform="rotate(10 23 14)" />
      {/* julemanden */}
      <circle cx="33" cy="15" r="4.2" fill="#f3c6a5" />
      <path d="M29 13c1-5 6-7 10-4l-1 3z" fill="#d42a45" />
      <circle cx="39.5" cy="9.5" r="1.6" fill="#f7f2e8" />
      <path d="M30 16c0 5 2 7 4 7s3-2 3-5" fill="#f7f2e8" />
      <path d="M28 25c0-4 3-6 6-6s5 2 5 6z" fill="#d42a45" />
      {/* meder */}
      <path d="M4 40h40c4 0 6-2 7-4" stroke="#f2c96b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M12 36v4M34 36v4" stroke="#f2c96b" strokeWidth="1.5" />
    </svg>
  );
}
