import { Link } from 'react-router-dom';
import { useNow } from '../lib/app-context';
import { pad2 } from '../lib/format';
import { countdownToChristmasEve, countdownToDecember, type CountdownState } from '@shared/season';
import { IconCalendar, IconGift } from './Icons';
import './countdowns.css';

function Digits({ c }: { c: CountdownState }) {
  const r = c.remaining;
  const units = [
    { v: r.days, l: r.days === 1 ? 'dag' : 'dage', pad: false },
    { v: r.hours, l: 'timer', pad: true },
    { v: r.minutes, l: 'min', pad: true },
    { v: r.seconds, l: 'sek', pad: true },
  ];
  return (
    <div className="cd-digits" role="timer" aria-live="off">
      {units.map((u, i) => (
        <div className="cd-unit" key={i}>
          <span className="cd-num mono">{u.pad ? pad2(u.v) : u.v}</span>
          <span className="cd-label">{u.l}</span>
        </div>
      ))}
    </div>
  );
}

function srText(c: CountdownState, what: string) {
  const r = c.remaining;
  return `${r.days} dage, ${r.hours} timer og ${r.minutes} minutter til ${what}`;
}

export function Countdowns() {
  const now = useNow(1000);
  const dec = countdownToDecember(now);
  const eve = countdownToChristmasEve(now);

  return (
    <section className="countdowns" aria-label="Nedtællinger">
      <article className="panel countdown" data-phase={dec.phase}>
        <div className="panel-head">
          <h2>
            <IconCalendar className="icon" /> Julekalenderen åbner
          </h2>
        </div>
        {dec.phase === 'reached' ? (
          <div className="cd-reached">
            <div className="cd-reached-title">Julekalenderen er åben!</div>
            <p>Der venter en ny låge hver dag frem til juleaften.</p>
            <Link className="btn btn-gold btn-small" to="/julekalender">
              Åbn dagens låge
            </Link>
          </div>
        ) : (
          <>
            <Digits c={dec} />
            <p className="sr-only">{srText(dec, '1. december')}</p>
            <p className="cd-sub">til 1. december {dec.targetYear}</p>
          </>
        )}
      </article>

      <article className="panel countdown countdown-eve" data-phase={eve.phase}>
        <div className="panel-head">
          <h2>
            <IconGift className="icon" /> Juleaften
          </h2>
        </div>
        {eve.phase === 'reached' ? (
          <div className="cd-reached">
            <div className="cd-reached-title">Glædelig jul!</div>
            <p>Det er juleaften – følg julemanden på kortet, mens han flyver jorden rundt.</p>
          </div>
        ) : (
          <>
            {eve.afterglow && <p className="cd-afterglow">Juleflyvningen er afsluttet – tak for i år! Nu tæller vi ned igen:</p>}
            <Digits c={eve} />
            <p className="sr-only">{srText(eve, 'juleaften')}</p>
            <p className="cd-sub">til 24. december {eve.targetYear}</p>
          </>
        )}
      </article>
    </section>
  );
}
