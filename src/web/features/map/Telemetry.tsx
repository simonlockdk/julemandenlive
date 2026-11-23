import { useSleigh, useSleighState } from './sleigh-context';
import { displayFlightAt, fmtLatLon, modeLabel, modeShort } from './labels';
import { IconActivity } from '../../components/Icons';
import { fmtDayTime, fmtNum, fmtRelative, fmtTime } from '../../lib/format';
import { compassDa } from '@shared/geo';
import { SEASON_LABELS, seasonMode } from '@shared/season';
import { flightStart, visitedStops } from '@shared/tracking';
import { useEffect } from 'react';
import { useStored } from '../../lib/storage';

export function Telemetry() {
  const { state: s, now } = useSleighState(250);
  const { ready } = useSleigh();
  const short = modeShort(s);
  const season = SEASON_LABELS[seasonMode(now)];
  const flight = s.flight;
  const cities = flight ? flight.stops.filter((x) => x.kind === 'city').length : 0;
  const visited = flight ? visitedStops(flight, now).length : 0;
  const [sawFlight, setSawFlight] = useStored('set-kanen-flyve', false);
  useEffect(() => {
    if (s.mode === 'flying' && !sawFlight) setSawFlight(true);
  }, [s.mode, sawFlight, setSawFlight]);

  return (
    <section className="panel telemetry" aria-labelledby="telemetri-titel">
      <div className="panel-head">
        <h2 id="telemetri-titel">
          <IconActivity className="icon" /> Flydata
        </h2>
        <span className={`tag tag-${short.tone === 'live' ? 'live' : 'ok'}`}>
          <span className={`dot ${short.tone === 'live' ? 'dot-pulse' : ''}`} />
          {short.text}
        </span>
      </div>

      <div className="telemetry-status" aria-live="polite">
        <div className="eyebrow">{flight ? flight.title : season.title}</div>
        <div className="telemetry-mode">{ready ? modeLabel(s) : 'Henter flyveplan …'}</div>
      </div>

      <dl className="telemetry-grid">
        <div>
          <dt>Hastighed</dt>
          <dd className="mono">
            {fmtNum(s.speedKmh)} <small>km/t</small>
          </dd>
        </div>
        <div>
          <dt>Højde</dt>
          <dd className="mono">
            {fmtNum(s.altitudeM)} <small>m</small>
          </dd>
        </div>
        <div>
          <dt>Kurs</dt>
          <dd className="mono">
            {Math.round(s.bearing)}° <small>{compassDa(s.bearing)}</small>
          </dd>
        </div>
        <div>
          <dt>Magi</dt>
          <dd className="mono">
            {s.mode === 'home' ? '100' : Math.max(62, Math.round(100 - s.flightProgress * 34))} <small>%</small>
          </dd>
        </div>
        <div className="wide">
          <dt>Position</dt>
          <dd className="mono small">{fmtLatLon(s.lat, s.lon)}</dd>
        </div>
      </dl>

      {flight ? (
        <>
          <div className="progress" role="progressbar" aria-label="Flyvningens fremskridt" aria-valuenow={Math.round(s.flightProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${s.flightProgress * 100}%` }} />
          </div>
          <div className="telemetry-foot">
            <span>
              {visited}/{cities} byer besøgt
            </span>
            {s.nextStop && (
              <span>
                {s.nextStop.kind === 'base' ? 'Hjem' : s.nextStop.name} om {fmtRelative(s.nextStop.arrive - now)} ({fmtTime(s.nextStop.arrive)})
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="telemetry-foot column">
          {s.nextFlight ? (
            <span>
              <strong>Næste flyvning:</strong> {s.nextFlight.title}, {fmtDayTime(flightStart(s.nextFlight), now)}
            </span>
          ) : (
            <span>{season.text}</span>
          )}
        </div>
      )}
      <p className="telemetry-note">Kanens data er en magisk simulation – ikke rigtige GPS-data.</p>
    </section>
  );
}

export function useDisplayFlight() {
  const { flights } = useSleigh();
  const { state, now } = useSleighState(1000);
  return { flight: displayFlightAt(now, state, flights), state, now };
}
