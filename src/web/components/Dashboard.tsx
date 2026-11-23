import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useNow } from '../lib/app-context';
import { apiGet, type JournalFlight } from '../lib/api';
import { fmtDayTime, fmtNum, fmtShortDate, fmtTime } from '../lib/format';
import { factOfTheDay, logEntries, northPoleStatus, northPoleWeather, type LogEntry } from '@shared/northpole';
import { compassDa } from '@shared/geo';
import { useSleighState } from '../features/map/sleigh-context';
import { HiddenNisse } from './HiddenNisse';
import { IconActivity, IconBook, IconBulb, IconCloud, IconReindeer, IconSnow, IconWarn, IconRadar } from './Icons';
import { REINDEER } from '@shared/content';
import './dashboard.css';

export function StatusPanel() {
  const { data } = useApp();
  const { state, now } = useSleighState(5000);
  const items = northPoleStatus(now, { sleighFlying: state.mode === 'flying', overrides: data?.status.overrides });
  const messages = data?.status.messages ?? [];
  return (
    <section className="panel status-panel" aria-labelledby="status-titel">
      <div className="panel-head">
        <h2 id="status-titel">
          <IconActivity className="icon" /> Nordpolens driftsstatus
        </h2>
        <span className="tag tag-ok">
          <span className="dot dot-pulse" /> Alle systemer kører
        </span>
      </div>
      <HiddenNisse id="status" style={{ right: 10, bottom: -6 }} />
      <ul className="status-list">
        {items.map((it) => (
          <li key={it.key} data-level={it.level}>
            <span className="status-led" aria-hidden="true" />
            <span className="status-label">{it.label}</span>
            <span className="status-value">{it.value}</span>
            {it.percent !== undefined && (
              <span className="status-bar" aria-hidden="true">
                <span style={{ width: `${it.percent}%` }} />
              </span>
            )}
          </li>
        ))}
      </ul>
      {messages.length > 0 && (
        <ul className="status-messages">
          {messages.map((m) => (
            <li key={m.id} data-level={m.level}>
              {m.text}
            </li>
          ))}
        </ul>
      )}
      <p className="panel-note">Alle tal er fantasifulde og opdateres hen over dagen.</p>
    </section>
  );
}

const CAT_LABEL: Record<LogEntry['category'], string> = {
  værksted: 'VÆRKSTED',
  stald: 'STALD',
  kane: 'KANE',
  kontor: 'KONTOR',
  sjov: 'NISSER',
  vejr: 'VEJR',
  system: 'SYSTEM',
};

export function Logbook() {
  const now = useNow(15_000);
  const { state } = useSleighState(15_000);
  const entries = logEntries(now, 10);
  // Flyvningens egne hændelser blandes ind øverst
  const flightEntries: LogEntry[] = [];
  if (state.flight) {
    const s0 = state.flight.stops[0]!;
    if (now >= s0.depart) flightEntries.push({ id: 'fl-dep', t: s0.depart, text: `Kanen lettede fra Nordpolen: ${state.flight.title}.`, category: 'kane' });
    const last = state.prevStop && state.prevStop.kind === 'city' ? state.prevStop : null;
    if (last) flightEntries.push({ id: 'fl-last', t: last.depart, text: `Kanen forlod ${last.name}. Alt vel om bord.`, category: 'kane' });
  }
  const all = [...flightEntries, ...entries].sort((a, b) => b.t - a.t).slice(0, 10);
  return (
    <section className="panel logbook" aria-labelledby="logbog-titel">
      <div className="panel-head">
        <h2 id="logbog-titel">
          <IconBook className="icon" /> Nordpolens logbog
        </h2>
        <span className="tag tag-live">
          <span className="dot dot-pulse" /> Opdateres
        </span>
      </div>
      <HiddenNisse id="logbog" style={{ right: 14, top: 46 }} />
      <ol className="log-list" aria-live="polite">
        {all.map((e) => (
          <li key={e.id}>
            <span className="log-time mono">{fmtTime(e.t)}</span>
            <span className="log-cat mono" data-cat={e.category}>
              {CAT_LABEL[e.category]}
            </span>
            <span className="log-text">{e.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WeatherPanel() {
  const now = useNow(60_000);
  const w = northPoleWeather(now);
  return (
    <section className="panel weather" aria-labelledby="vejr-titel">
      <div className="panel-head">
        <h2 id="vejr-titel">
          <IconCloud className="icon" /> Vejret på Nordpolen
        </h2>
        <span className="tag tag-sim">Simuleret</span>
      </div>
      <HiddenNisse id="vejr" style={{ right: 12, bottom: 8 }} />
      <div className="weather-main">
        <div className="weather-temp mono">{w.tempC.toLocaleString('da-DK', { maximumFractionDigits: 0 })}°</div>
        <div>
          <div className="weather-summary">{w.summary}</div>
          <div className="weather-sub">
            Vind {w.windMs.toLocaleString('da-DK', { maximumFractionDigits: 0 })} m/s fra {compassDa(w.windDir)} · sigt {w.visibilityKm.toLocaleString('da-DK')} km
          </div>
        </div>
        <IconSnow className="weather-icon" />
      </div>
      <dl className="weather-grid">
        <div>
          <dt>Sne</dt>
          <dd>{w.snow}</dd>
        </div>
        <div>
          <dt>Nordlys</dt>
          <dd>{w.auroraChance} %</dd>
        </div>
        <div>
          <dt>Flyvevejr</dt>
          <dd>{w.warning ? 'Forsigtig' : 'Godt'}</dd>
        </div>
      </dl>
      {w.warning && (
        <p className="weather-warn">
          <IconWarn width={18} /> {w.warning}
        </p>
      )}
    </section>
  );
}

export function DailyFact() {
  const now = useNow(60_000);
  const f = factOfTheDay(now);
  return (
    <section className="panel fact" aria-labelledby="fakta-titel">
      <div className="panel-head">
        <h2 id="fakta-titel">
          <IconBulb className="icon" /> Dagens julefakta
        </h2>
        <span className="tag tag-sim">{fmtShortDate(now)}</span>
      </div>
      <p className="fact-text">{f.text}</p>
    </section>
  );
}

export function FlightJournal() {
  const { data } = useApp();
  const [flights, setFlights] = useState<JournalFlight[] | null>(null);
  const [error, setError] = useState(false);
  const now = useNow(60_000);
  useEffect(() => {
    if (!data) return;
    apiGet<{ flights: JournalFlight[] }>('/api/journal')
      .then((r) => setFlights(r.flights))
      .catch(() => setError(true));
    // genhent hvert 10. minut (styres af useNow-minutter)
  }, [data, Math.floor(now / 600_000)]);

  return (
    <section className="panel journal" aria-labelledby="journal-titel">
      <div className="panel-head">
        <h2 id="journal-titel">
          <IconRadar className="icon" /> Julemandens flyvejournal
        </h2>
      </div>
      <HiddenNisse id="journal" style={{ right: 12, top: 50 }} />
      {error && <p className="empty">Flyvejournalen kunne ikke hentes.</p>}
      {!flights && !error && <div className="loading-shimmer" style={{ height: 120, borderRadius: 10 }} />}
      {flights && flights.length === 0 && (
        <p className="empty">Ingen flyvninger endnu i denne sæson. Første prøveflyvning kommer snart!</p>
      )}
      {flights && flights.length > 0 && (
        <ol className="journal-list">
          {flights.slice(0, 6).map((f) => (
            <li key={f.id} data-type={f.type}>
              <div className="journal-top">
                <strong>{f.title}</strong>
                {f.inProgress ? <span className="tag tag-live">I gang</span> : <span className="journal-date">{fmtDayTime(f.start, now)}</span>}
              </div>
              <div className="journal-meta">
                {fmtNum(f.distanceKm)} km · {f.stops.length} stop: {f.stops.slice(0, 4).join(', ')}
                {f.stops.length > 4 ? ' …' : ''}
              </div>
              <div className="journal-cond">
                Kanens tilstand: {f.condition} · Landing {f.landingScore.replace('.', ',')}/10
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function ReindeerTeaser() {
  const now = useNow(60_000);
  const r = REINDEER[Math.floor(now / 86_400_000) % REINDEER.length]!;
  return (
    <section className="panel reindeer-teaser" aria-labelledby="dagens-rensdyr">
      <div className="panel-head">
        <h2 id="dagens-rensdyr">
          <IconReindeer className="icon" /> Dagens rensdyr
        </h2>
      </div>
      <div className="teaser-name">{r.name}</div>
      <div className="teaser-role">{r.role}</div>
      <p>{r.funFact}</p>
      <Link className="btn btn-small" to={`/rensdyr#${r.id}`}>
        Mød alle rensdyrene
      </Link>
    </section>
  );
}
