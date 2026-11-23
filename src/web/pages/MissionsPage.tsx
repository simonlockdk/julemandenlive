import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../lib/hooks';
import { useStored } from '../lib/storage';
import { useNow } from '../lib/app-context';
import { HiddenNisse, HIDDEN_NISSER, useHiddenNisser } from '../components/HiddenNisse';
import { NisseFigure, Emblem } from '../components/Art';
import { IconCheck, IconGift, IconMission, IconPlus, IconPrint, IconTrash, IconStar } from '../components/Icons';
import { useOpenedDoors } from '../features/calendar/CalendarPage';
import { todaysDoor } from '@shared/season';
import { fmtDate } from '../lib/format';
import './pages.css';

function printOnly(what: 'wish' | 'diploma') {
  document.body.dataset.print = what;
  const done = () => {
    delete document.body.dataset.print;
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
}

/* ---------------- ønskeseddel ---------------- */

interface Wish {
  id: string;
  text: string;
}

function WishList() {
  const [name, setName] = useStored('oenskeseddel-navn', '');
  const [wishes, setWishes] = useStored<Wish[]>('oenskeseddel', []);
  const [draft, setDraft] = useState('');
  const [sent, setSent] = useState(false);

  const add = () => {
    const text = draft.trim().slice(0, 120);
    if (!text || wishes.length >= 20) return;
    setWishes((w) => [...w, { id: Math.random().toString(36).slice(2), text }]);
    setDraft('');
  };

  return (
    <section className="panel wishlist print-area" aria-labelledby="oenske-titel">
      <div className="panel-head">
        <h2 id="oenske-titel">
          <IconGift className="icon" /> Den store ønskeseddel
        </h2>
      </div>
      <div className="wish-paper">
        <div className="wish-head">
          <Emblem className="wish-emblem" />
          <div>
            <div className="wish-title">Kære julemand</div>
            <div className="wish-sub">Her er min ønskeseddel</div>
          </div>
        </div>
        <div className="field no-print">
          <label htmlFor="wish-name">Dit fornavn (valgfrit)</label>
          <input id="wish-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Fx Ida" autoComplete="off" />
        </div>
        <ol className="wish-items">
          {wishes.map((w) => (
            <li key={w.id}>
              <span>{w.text}</span>
              <button type="button" className="icon-btn no-print" aria-label={`Fjern ${w.text}`} onClick={() => setWishes((ws) => ws.filter((x) => x.id !== w.id))}>
                <IconTrash />
              </button>
            </li>
          ))}
          {wishes.length === 0 && <li className="wish-empty">Din ønskeseddel er tom. Skriv dit første ønske herunder!</li>}
        </ol>
        <form
          className="wish-add no-print"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label htmlFor="wish-input" className="sr-only">
            Nyt ønske
          </label>
          <input id="wish-input" className="input" value={draft} maxLength={120} onChange={(e) => setDraft(e.target.value)} placeholder="Jeg ønsker mig …" autoComplete="off" />
          <button type="submit" className="btn btn-primary" disabled={!draft.trim() || wishes.length >= 20}>
            <IconPlus /> Tilføj
          </button>
        </form>
        <div className="wish-sign">Kærlig hilsen {name || '……………………'}</div>
      </div>
      <div className="wish-actions no-print">
        <button type="button" className="btn btn-gold" onClick={() => setSent(true)} disabled={wishes.length === 0}>
          Send til Nordpolen
        </button>
        <button type="button" className="btn" onClick={() => printOnly('wish')} disabled={wishes.length === 0}>
          <IconPrint /> Print ønskesedlen
        </button>
      </div>
      {sent && (
        <div className="wish-sent no-print" role="status">
          <div className="envelope" aria-hidden="true">
            ✉️
          </div>
          <p>
            <strong>Ønskesedlen er pakket i kuverten!</strong> Den bliver kun gemt her på din enhed – den sendes ikke over internettet. Print den, og giv den til en voksen, eller læg den i julemandens postkasse.
          </p>
        </div>
      )}
      <p className="panel-note no-print">Ønskesedlen gemmes kun i din browser. Vi indsamler ingen oplysninger.</p>
    </section>
  );
}

/* ---------------- missioner ---------------- */

interface Mission {
  id: string;
  title: string;
  text: string;
  auto?: boolean;
  done?: boolean;
}

function Missions() {
  const { found } = useHiddenNisser();
  const [opened] = useOpenedDoors();
  const [solved] = useStored<number[]>('loeste-gaader', []);
  const [camsSeen] = useStored<string[]>('sete-kameraer', []);
  const [sawFlight] = useStored<boolean>('set-kanen-flyve', false);
  const [manual, setManual] = useStored<string[]>('missioner-udfoert', []);
  const now = useNow(60_000);
  const today = todaysDoor(now);

  const missions: Mission[] = [
    { id: 'nisser5', title: 'Nissespejder', text: 'Find 5 skjulte nisser på siden.', auto: true, done: found.length >= 5 },
    { id: 'kameraer', title: 'Vagt i kontrolcentralen', text: 'Kig på alle 8 kameraer i stor visning.', auto: true, done: camsSeen.length >= 8 },
    { id: 'kanen', title: 'Radaroperatør', text: 'Se kanen i luften på flyradaren.', auto: true, done: sawFlight },
    { id: 'gaader', title: 'Gådeknækker', text: 'Løs 3 gåder eller quizzer i julekalenderen.', auto: true, done: solved.length >= 3 },
    {
      id: 'dagens',
      title: 'Dagens låge',
      text: today ? `Åbn låge ${today} i julekalenderen.` : 'Åbn en låge i julekalenderen (i december).',
      auto: true,
      done: today ? opened.includes(today) : false,
    },
    { id: 'hjerte', title: 'Julehjerte-mester', text: 'Klip og flet et julehjerte i papir.' },
    { id: 'sang', title: 'Juleshow', text: 'Syng en julesang for en, du holder af.' },
    { id: 'fugle', title: 'Fuglevennen', text: 'Hæng mad op til fuglene i haven eller på altanen.' },
    { id: 'hjaelp', title: 'Hjælpenisse', text: 'Hjælp til med noget derhjemme – uden at blive spurgt.' },
    { id: 'grod', title: 'Husnissens ven', text: 'Stil en lille skål risengrød til nissen.' },
  ].map((m) => (m.auto ? m : { ...m, done: manual.includes(m.id) }));

  const done = missions.filter((m) => m.done).length;
  return (
    <section className="panel" aria-labelledby="missioner-titel">
      <div className="panel-head">
        <h2 id="missioner-titel">
          <IconMission className="icon" /> Julemissioner
        </h2>
        <span className="tag tag-ok">
          {done}/{missions.length} klaret
        </span>
      </div>
      <ul className="mission-list">
        {missions.map((m) => (
          <li key={m.id} data-done={!!m.done}>
            {m.auto ? (
              <span className="mission-check" aria-hidden="true">
                {m.done && <IconCheck />}
              </span>
            ) : (
              <input
                type="checkbox"
                className="mission-box"
                checked={!!m.done}
                aria-label={`Markér "${m.title}" som klaret`}
                onChange={(e) => setManual((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((x) => x !== m.id)))}
              />
            )}
            <div>
              <div className="mission-title">
                {m.title} {m.auto && <span className="tag tag-sim">Automatisk</span>}
              </div>
              <div className="mission-text">{m.text}</div>
            </div>
          </li>
        ))}
      </ul>
      {done === missions.length && <p className="game-win">Alle missioner klaret! Du er en ægte æresnisse.</p>}
    </section>
  );
}

/* ---------------- nissejagt + diplom ---------------- */

function NisseHunt() {
  const { found } = useHiddenNisser();
  const [name, setName] = useStored('diplom-navn', '');
  const now = useNow(60_000);
  const all = found.length === HIDDEN_NISSER.length;
  return (
    <section id="nisser" className="panel" aria-labelledby="nissejagt-titel">
      <div className="panel-head">
        <h2 id="nissejagt-titel">
          <IconStar className="icon" /> Find de skjulte nisser
        </h2>
        <span className="tag tag-ok">
          {found.length}/{HIDDEN_NISSER.length}
        </span>
      </div>
      <p>Der gemmer sig {HIDDEN_NISSER.length} små nisser rundt omkring på siden. Klik på dem, når du finder dem!</p>
      <ul className="nisse-grid">
        {HIDDEN_NISSER.map((n, i) => {
          const f = found.includes(n.id);
          return (
            <li key={n.id} data-found={f}>
              <NisseFigure variant={i} className="nisse-slot" />
              <strong>{f ? n.name : '???'}</strong>
              <small>{f ? 'Fundet!' : n.hint}</small>
            </li>
          );
        })}
      </ul>
      {all && (
        <div className="diploma print-area">
          <div className="diploma-inner">
            <Emblem className="diploma-emblem" />
            <div className="eyebrow">Nordpolens Kontrolcentral</div>
            <h3>Diplom</h3>
            <p>Hermed bevidnes det, at</p>
            <div className="diploma-name">{name || 'en meget dygtig nissefinder'}</div>
            <p>har fundet alle {HIDDEN_NISSER.length} skjulte nisser og udnævnes til</p>
            <div className="diploma-title">Æresnisse af Nordpolen</div>
            <p className="diploma-date">{fmtDate(now)}</p>
          </div>
          <div className="diploma-actions no-print">
            <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Skriv dit navn på diplomet" aria-label="Navn på diplomet" />
            <button type="button" className="btn btn-gold" onClick={() => printOnly('diploma')}>
              <IconPrint /> Print diplom
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function MissionsPage() {
  useDocumentTitle('Missioner');
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [hash]);
  return (
    <div className="missions-page">
      <div className="page-hero no-print">
        <div>
          <div className="eyebrow">For nissehjælpere</div>
          <h1>Missioner og ønsker</h1>
          <p>Skriv din ønskeseddel, klar julemissionerne og find alle de skjulte nisser. Alt gemmes kun på din egen enhed.</p>
        </div>
        <HiddenNisse id="missioner" style={{ right: 10, top: 10 }} />
      </div>
      <div className="missions-grid">
        <WishList />
        <div className="missions-col no-print">
          <Missions />
        </div>
      </div>
      <div className="no-print-wrap">
        <NisseHunt />
      </div>
    </div>
  );
}
