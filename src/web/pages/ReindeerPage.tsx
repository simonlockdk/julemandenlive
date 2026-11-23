import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { REINDEER, type Reindeer } from '@shared/content';
import { useDocumentTitle } from '../lib/hooks';
import { HiddenNisse } from '../components/HiddenNisse';
import { IconCamera } from '../components/Icons';
import './pages.css';

function Portrait({ r }: { r: Reindeer }) {
  const fur = `hsl(${r.hue} 42% 36%)`;
  const furLight = `hsl(${r.hue} 40% 48%)`;
  const glowNose = r.id === 'rudolf';
  return (
    <svg viewBox="0 0 120 120" className="deer-portrait" aria-hidden="true">
      <defs>
        <radialGradient id={`bg-${r.id}`} cx="50%" cy="40%" r="65%">
          <stop offset="0" stopColor="#234179" />
          <stop offset="1" stopColor="#0a1530" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#bg-${r.id})`} stroke="#f2c96b" strokeOpacity=".5" strokeWidth="2" />
      <g stroke="#e3cfa6" strokeWidth="3.4" strokeLinecap="round" fill="none">
        <path d="M44 38 C38 26 36 18 40 8 M40 22 L30 16 M38 30 L26 28" />
        <path d="M76 38 C82 26 84 18 80 8 M80 22 L90 16 M82 30 L94 28" />
      </g>
      <ellipse cx="34" cy="48" rx="10" ry="5" fill={fur} transform="rotate(-25 34 48)" />
      <ellipse cx="86" cy="48" rx="10" ry="5" fill={fur} transform="rotate(25 86 48)" />
      <path d="M40 46 C40 34 80 34 80 46 C82 66 74 92 60 96 C46 92 38 66 40 46z" fill={fur} />
      <path d="M50 70 C50 62 70 62 70 70 C70 84 64 92 60 92 C56 92 50 84 50 70z" fill={furLight} />
      <circle cx="50" cy="56" r="4" fill="#1b1410" />
      <circle cx="70" cy="56" r="4" fill="#1b1410" />
      <circle cx="51.2" cy="54.6" r="1.3" fill="#fff" />
      <circle cx="71.2" cy="54.6" r="1.3" fill="#fff" />
      {glowNose && <circle cx="60" cy="88" r="14" fill="#ff5a5a" opacity=".25" className="nose-pulse" />}
      <ellipse cx="60" cy="88" rx="7" ry="5.5" fill={glowNose ? '#ff4d4d' : '#2b1a12'} />
      <path d="M44 100 Q60 108 76 100 L74 106 Q60 113 46 106z" fill="#d42a45" />
      <circle cx="60" cy="107" r="3.4" fill="#f2c96b" />
    </svg>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="deer-stat">
      <span>{label}</span>
      <span className="deer-bar" role="meter" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={10}>
        <span style={{ width: `${v * 10}%` }} />
      </span>
    </div>
  );
}

export default function ReindeerPage() {
  useDocumentTitle('Rensdyrregister');
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' });
  }, [hash]);

  return (
    <div>
      <div className="page-hero">
        <div>
          <div className="eyebrow">Rensdyrregistret</div>
          <h1>Julemandens rensdyr</h1>
          <p>Mød holdet, der trækker kanen jorden rundt. Hvert rensdyr har sin egen opgave i spandet – og sine egne små særheder.</p>
        </div>
        <HiddenNisse id="rensdyr" style={{ right: 10, top: 0 }} />
        <Link to="/overvaagning?kamera=cam02" className="btn">
          <IconCamera /> Se stalden live
        </Link>
      </div>

      <section className="panel team-panel" aria-labelledby="spandet">
        <h2 id="spandet">Spandets opstilling</h2>
        <div className="team">
          <div className="team-row lead">
            <span className="team-deer">Rudolf</span>
          </div>
          {[
            ['Lynfod', 'Danser'],
            ['Springer', 'Rap'],
            ['Komet', 'Amor'],
            ['Torden', 'Lyn'],
          ].map((row, i) => (
            <div className="team-row" key={i}>
              {row.map((n) => (
                <span className="team-deer" key={n}>
                  {n}
                </span>
              ))}
            </div>
          ))}
          <div className="team-row sleigh-row">
            <span>Kanen</span>
          </div>
        </div>
        <p className="panel-note">Stjerneskud træner stadig og flyver med som reserve, når han har været sød.</p>
      </section>

      <div className="deer-grid">
        {REINDEER.map((r) => (
          <article key={r.id} id={r.id} className="panel deer-card">
            <Portrait r={r} />
            <div className="deer-body">
              <div className="eyebrow">{r.position}</div>
              <h2>{r.name}</h2>
              <div className="deer-role">{r.role}</div>
              <p>{r.personality}</p>
              <p className="deer-fact">
                <strong>Vidste du?</strong> {r.funFact}
              </p>
              <p className="deer-snack">Livret: {r.favoriteSnack}</p>
              <div className="deer-stats">
                <Stat label="Fart" v={r.stats.speed} />
                <Stat label="Navigation" v={r.stats.navigation} />
                <Stat label="Udholdenhed" v={r.stats.stamina} />
                <Stat label="Drillesyge" v={r.stats.mischief} />
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="panel-note" style={{ textAlign: 'center' }}>
        De otte klassiske rensdyrnavne stammer fra digtet "A Visit from St. Nicholas" (1823). Rudolf med den røde næse fører an foran spandet, og Stjerneskud er Nordpolens Kontrolcentrals eget rensdyr.
      </p>
    </div>
  );
}
