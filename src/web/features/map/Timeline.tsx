import { useEffect, useRef } from 'react';
import { useDisplayFlight } from './Telemetry';
import { IconClock } from '../../components/Icons';
import { fmtDayTime, fmtTime, fmtTimeIn } from '../../lib/format';
import { flightStart } from '@shared/tracking';

/** Rejsetidslinje for den aktuelle (eller næste) flyvning. */
export function Timeline() {
  const { flight, now } = useDisplayFlight();
  const listRef = useRef<HTMLOListElement>(null);
  const currentIdx = flight ? flight.stops.findIndex((s) => now < s.depart) : -1;

  // Hold det aktuelle stop i syne – uden at rulle hele siden.
  useEffect(() => {
    const list = listRef.current;
    if (!list || currentIdx < 0) return;
    const el = list.children[currentIdx] as HTMLElement | undefined;
    if (!el) return;
    const target = el.offsetTop - list.clientHeight / 3;
    list.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [currentIdx, flight?.id]);

  const upcoming = flight && flightStart(flight) > now;

  return (
    <section className="panel timeline" aria-labelledby="tidslinje-titel">
      <div className="panel-head">
        <h2 id="tidslinje-titel">
          <IconClock className="icon" /> Rejsetidslinje
        </h2>
        {flight && <span className="tag tag-sim">{flight.type === 'christmas' ? 'Juleaften' : upcoming ? 'Planlagt' : 'Prøveflyvning'}</span>}
      </div>
      {!flight ? (
        <p className="empty">Ingen flyvninger planlagt de næste dage. Julemanden hviler sig på Nordpolen.</p>
      ) : (
        <>
          <p className="timeline-title">
            <strong>{flight.title}</strong>
            {upcoming && <> · starter {fmtDayTime(flightStart(flight), now)}</>}
          </p>
          <ol ref={listRef} className="timeline-list">
            {flight.stops.map((s, i) => {
              const status = now >= s.depart ? 'done' : now >= s.arrive ? 'now' : 'next';
              const showLocal = flight.type === 'christmas' && !!s.tz && fmtTimeIn(s.arrive, s.tz) !== fmtTime(s.arrive);
              return (
                <li key={s.id} data-status={status} aria-current={i === currentIdx ? 'step' : undefined}>
                  <span className="tl-time mono">{fmtTime(i === 0 ? s.depart : s.arrive)}</span>
                  <span className="tl-dot" aria-hidden="true" />
                  <span className="tl-name">
                    {s.kind === 'base' ? (i === 0 ? 'Afgang fra Nordpolen' : 'Landing på Nordpolen') : s.name}
                    {s.country && <small> {s.country}</small>}
                    {showLocal && <small className="tl-local"> · {fmtTimeIn(s.arrive, s.tz!)} lokal tid</small>}
                  </span>
                  <span className="sr-only">{status === 'done' ? 'besøgt' : status === 'now' ? 'nu' : 'kommende'}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
