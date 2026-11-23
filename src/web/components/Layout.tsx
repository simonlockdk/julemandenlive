import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Emblem, NisseFigure } from './Art';
import { IconCalendar, IconCamera, IconMission, IconRadar, IconReindeer, IconClose, IconWarn, IconStar, IconInfo, IconClock } from './Icons';
import { HiddenNisse, HIDDEN_NISSER, useHiddenNisser } from './HiddenNisse';
import { Snowfall } from './Snowfall';
import { useApp, useNow } from '../lib/app-context';
import { fmtTimeSec, fmtDate } from '../lib/format';
import { useStored } from '../lib/storage';
import { nisseAlarmAt, type NisseAlarm } from '@shared/northpole';

const NAV = [
  { to: '/', label: 'Kontrolcentral', short: 'Radar', icon: IconRadar, end: true },
  { to: '/overvaagning', label: 'Overvågning', short: 'Kameraer', icon: IconCamera },
  { to: '/julekalender', label: 'Julekalender', short: 'Kalender', icon: IconCalendar },
  { to: '/rensdyr', label: 'Rensdyr', short: 'Rensdyr', icon: IconReindeer },
  { to: '/missioner', label: 'Missioner', short: 'Missioner', icon: IconMission },
];

function HeaderClock() {
  const now = useNow(1000);
  return (
    <div className="header-clock" aria-label="Dansk tid">
      <span className="time">{fmtTimeSec(now)}</span>
      <span className="label">{fmtDate(now)}</span>
    </div>
  );
}

function Header() {
  const { found } = useHiddenNisser();
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Nordpolens Kontrolcentral – forside">
        <Emblem className="brand-emblem" />
        <span className="brand-text">
          <span className="brand-title">Nordpolens Kontrolcentral</span>
          <span className="brand-sub">Magisk flyradar · Nordpolen</span>
        </span>
      </Link>
      <HiddenNisse id="logo" style={{ left: 'calc(var(--gutter) + 22px)', top: 30, width: 20, height: 24 }} />
      <nav className="main-nav" aria-label="Hovedmenu">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <n.icon />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="header-tools">
        <Link to="/missioner#nisser" className="nisse-counter" title="Skjulte nisser fundet">
          <NisseFigure />
          <span>
            {found.length}/{HIDDEN_NISSER.length}
          </span>
          <span className="sr-only">skjulte nisser fundet</span>
        </Link>
        <HeaderClock />
      </div>
    </header>
  );
}

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Hovedmenu (mobil)">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end}>
          <n.icon />
          {n.short}
        </NavLink>
      ))}
    </nav>
  );
}

function Banners() {
  const { data, timeMachine, clock } = useApp();
  if (!data) return null;
  const items: { key: string; level: string; title?: string; text: string; icon: ReactNode }[] = [];
  if (timeMachine.active) {
    items.push({
      key: 'tm',
      level: 'timemachine',
      title: 'Tidsmaskine aktiv',
      text: `Du ser Nordpolen, som den er ${fmtDate(clock.now())}.`,
      icon: <IconClock />,
    });
  }
  if (data.site.banner.enabled && data.site.banner.text) {
    items.push({ key: 'site', level: data.site.banner.level, text: data.site.banner.text, icon: <IconInfo /> });
  }
  for (const e of data.events) {
    if (e.type === 'banner' || e.type === 'celebration' || e.type === 'grounded' || e.type === 'snowstorm') {
      items.push({
        key: e.id,
        level: e.type === 'grounded' || e.type === 'snowstorm' ? 'warn' : e.type === 'celebration' ? 'celebration' : 'info',
        title: e.title,
        text: e.message,
        icon: e.type === 'grounded' || e.type === 'snowstorm' ? <IconWarn /> : <IconStar />,
      });
    }
  }
  if (!items.length) return null;
  return (
    <div className="banners" role="region" aria-label="Meddelelser">
      {items.map((b) => (
        <div key={b.key} className="banner" data-level={b.level}>
          {b.icon}
          <div>
            {b.title && <strong>{b.title}. </strong>}
            {b.text}
          </div>
          {b.key === 'tm' && (
            <button type="button" className="btn btn-small" style={{ marginLeft: 'auto' }} onClick={timeMachine.reset}>
              Tilbage til nu
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function Toasts() {
  const { data } = useApp();
  const { lastFound, found } = useHiddenNisser();
  const now = useNow(2000);
  const [muted, setMuted] = useStored('nissealarm-slaaet-fra', false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [nisseToast, setNisseToast] = useState<typeof lastFound>(null);
  const location = useLocation();

  useEffect(() => {
    if (!lastFound) return;
    setNisseToast(lastFound);
    const id = window.setTimeout(() => setNisseToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [lastFound]);

  // Nissealarmer vises ikke i admin eller i enkeltkamera-vinduer
  const quiet = location.pathname.startsWith('/admin') || location.pathname.startsWith('/kamera/');
  const alarm: NisseAlarm | null = data?.site.features.nisseAlarm && !muted && !quiet ? nisseAlarmAt(now) : null;
  const showAlarm = alarm && !dismissed.includes(alarm.id);

  return (
    <div className="toasts" aria-live="polite">
      {nisseToast && (
        <div className="toast" role="status">
          <NisseFigure className="toast-icon" />
          <div>
            <div className="toast-title">Du fandt {nisseToast.name}!</div>
            <div className="toast-text">
              {found.length === HIDDEN_NISSER.length
                ? 'Du har fundet ALLE de skjulte nisser! Se dit diplom under Missioner.'
                : `${found.length} af ${HIDDEN_NISSER.length} skjulte nisser fundet.`}
            </div>
          </div>
          <button type="button" className="toast-close" aria-label="Luk" onClick={() => setNisseToast(null)}>
            <IconClose width={18} />
          </button>
        </div>
      )}
      {showAlarm && (
        <div className="toast" data-kind="alarm" role="status">
          <NisseFigure className="toast-icon" variant={2} />
          <div>
            <div className="toast-title">{alarm.title}</div>
            <div className="toast-text">{alarm.text}</div>
            <div className="toast-actions">
              {alarm.camera && (
                <Link className="btn btn-small btn-primary" to={`/overvaagning?kamera=${alarm.camera}`} onClick={() => setDismissed((d) => [...d, alarm.id])}>
                  Se kameraet
                </Link>
              )}
              <button type="button" className="btn btn-small btn-ghost" onClick={() => setMuted(true)}>
                Slå alarmer fra
              </button>
            </div>
          </div>
          <button type="button" className="toast-close" aria-label="Luk" onClick={() => setDismissed((d) => [...d, alarm.id])}>
            <IconClose width={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function Footer() {
  const { data } = useApp();
  const [muted, setMuted] = useStored('nissealarm-slaaet-fra', false);
  const [noSnow, setNoSnow] = useStored('sne-slaaet-fra', false);
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <HiddenNisse id="footer" style={{ right: 0, top: -48 }} />
        <div>
          <h3>Om Nordpolens Kontrolcentral</h3>
          <p>{data?.site.footerText}</p>
          <p>
            <Link to="/om">Læs mere om siden, privatliv og kort</Link>
          </p>
        </div>
        <div>
          <h3>Gå på opdagelse</h3>
          <ul>
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to}>{n.label}</Link>
              </li>
            ))}
            <li>
              <Link to="/om">Om siden</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>Indstillinger</h3>
          <label className="switch footer-switch">
            <input type="checkbox" checked={!noSnow} onChange={(e) => setNoSnow(!e.target.checked)} />
            Faldende sne
          </label>
          <label className="switch footer-switch">
            <input type="checkbox" checked={!muted} onChange={(e) => setMuted(!e.target.checked)} />
            Nissealarmer
          </label>
          <p style={{ marginTop: 12, fontSize: '0.8rem' }}>Indstillingerne gemmes kun i din browser.</p>
        </div>
      </div>
      <p className="footer-domain">julemandenlive.dk · {new Date().getFullYear()}</p>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { data, error, reload } = useApp();
  const [noSnow] = useStored('sne-slaaet-fra', false);
  const location = useLocation();
  const strongAurora = !!data?.events.some((e) => e.type === 'aurora');
  const storm = !!data?.events.some((e) => e.type === 'snowstorm');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="app">
      <a className="skip-link" href="#indhold">
        Spring til indhold
      </a>
      <div className="sky" aria-hidden="true" />
      <div className="aurora" aria-hidden="true" data-strong={strongAurora} />
      {(data?.site.features.snow ?? true) && !noSnow && <Snowfall intensity={storm ? 2.2 : 1} />}
      <Header />
      <main id="indhold" className="main" tabIndex={-1}>
        {error && (
          <div className="banner" data-level="warn" role="alert" style={{ marginBottom: 16 }}>
            <IconWarn />
            <div>{error}</div>
            <button type="button" className="btn btn-small" style={{ marginLeft: 'auto' }} onClick={reload}>
              Prøv igen
            </button>
          </div>
        )}
        <Banners />
        {children}
      </main>
      <Footer />
      <BottomNav />
      <Toasts />
    </div>
  );
}
