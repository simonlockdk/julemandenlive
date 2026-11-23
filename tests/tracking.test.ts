import { describe, expect, it } from 'vitest';
import defaults from '../src/server/defaults/tracking.json';
import {
  autoTestFlightForDate,
  buildChristmasFlight,
  buildSchedule,
  flightEnd,
  flightStart,
  sleighStateAt,
  type TrackingConfig,
} from '../src/shared/tracking';
import { distanceKm } from '../src/shared/geo';
import { HOUR, MINUTE, zonedParts, zonedTimeToUtc } from '../src/shared/time';

const cfg = defaults as unknown as TrackingConfig;
const home = cfg.homeBase;
const dk = (y: number, m: number, d: number, h = 0, mi = 0) => zonedTimeToUtc(y, m, d, h, mi, 0, 'Europe/Copenhagen');

describe('juleflyvningen', () => {
  const flight = buildChristmasFlight(cfg, 2026)!;
  const cities = flight.stops.filter((s) => s.kind === 'city');

  it('besøger alle byer præcis én gang', () => {
    expect(cities.length).toBe(cfg.christmas.cities.length);
    expect(new Set(cities.map((c) => c.name)).size).toBe(cities.length);
  });

  it('har strengt stigende tider uden overlap', () => {
    for (let i = 1; i < flight.stops.length; i++) {
      const a = flight.stops[i - 1]!;
      const b = flight.stops[i]!;
      expect(a.depart).toBeGreaterThanOrEqual(a.arrive);
      expect(b.arrive).toBeGreaterThan(a.depart);
    }
  });

  it('starter og slutter på Nordpolen', () => {
    expect(flight.stops[0]!.kind).toBe('base');
    expect(flight.stops.at(-1)!.kind).toBe('base');
  });

  it('kommer forbi omkring kl. 18–20 lokal tid', () => {
    const tzOf = new Map(cfg.christmas.cities.map((c) => [c.name, c.tz!]));
    const hours = cities.map((c) => {
      const p = zonedParts(c.arrive, tzOf.get(c.name)!);
      return { name: c.name, day: p.day, h: p.hour + p.minute / 60 };
    });
    // Alle byer besøges juleaften lokal tid…
    for (const x of hours) expect(x.day, x.name).toBe(24);
    // …og langt de fleste inden for 17:30–20:59
    const inWindow = hours.filter((x) => x.h >= 17.5 && x.h < 21);
    expect(inWindow.length / hours.length).toBeGreaterThan(0.9);
    // Danske byer skal ligge pænt i aftenvinduet
    const danish = cities.filter((c) => c.country === 'Danmark');
    for (const c of danish) {
      const h = zonedParts(c.arrive, 'Europe/Copenhagen').hour;
      expect(h, c.name).toBeGreaterThanOrEqual(18);
      expect(h, c.name).toBeLessThan(21);
    }
  });

  it('er deterministisk', () => {
    expect(buildChristmasFlight(cfg, 2026)).toEqual(flight);
  });

  it('kan sættes til en anden lokal måltid', () => {
    const other = buildChristmasFlight({ ...cfg, christmas: { ...cfg.christmas, localTargetTime: '17:00' } }, 2026)!;
    const cph = other.stops.find((s) => s.name === 'København')!;
    expect(zonedParts(cph.arrive, 'Europe/Copenhagen').hour).toBeLessThan(19);
  });
});

describe('kanens position', () => {
  const flight = buildChristmasFlight(cfg, 2026)!;

  it('står på Nordpolen før og efter flyvningen', () => {
    const before = sleighStateAt(flightStart(flight) - 2 * HOUR, [flight], home);
    expect(before.mode).toBe('home');
    expect(before.nextFlight?.id).toBe(flight.id);
    const after = sleighStateAt(flightEnd(flight) + 2 * HOUR, [flight], home);
    expect(after.mode).toBe('home');
    expect(after.lastFlight?.id).toBe(flight.id);
  });

  it('bevæger sig kontinuerligt (ingen spring)', () => {
    let prev = sleighStateAt(flightStart(flight), [flight], home);
    let maxJump = 0;
    for (let t = flightStart(flight); t <= flightEnd(flight); t += 1000) {
      const s = sleighStateAt(t, [flight], home);
      maxJump = Math.max(maxJump, distanceKm(prev, s));
      prev = s;
    }
    // ét sekund – selv julemagisk fart må ikke give teleportering
    expect(maxJump).toBeLessThan(40);
  });

  it('besøger byerne og flyver imellem dem', () => {
    const cph = flight.stops.find((s) => s.name === 'København')!;
    const at = sleighStateAt((cph.arrive + cph.depart) / 2, [flight], home);
    expect(at.mode).toBe('visiting');
    expect(at.currentStop?.name).toBe('København');
    const nxt = flight.stops[flight.stops.indexOf(cph) + 1]!;
    const between = sleighStateAt((cph.depart + nxt.arrive) / 2, [flight], home);
    expect(between.mode).toBe('flying');
    expect(between.speedKmh).toBeGreaterThan(0);
    expect(between.altitudeM).toBeGreaterThan(0);
    expect(between.prevStop?.name).toBe('København');
  });

  it('giver samme svar uanset hvornår det beregnes (ingen tilstand)', () => {
    const t = flightStart(flight) + 5 * HOUR + 1234;
    expect(sleighStateAt(t, [flight], home)).toEqual(sleighStateAt(t, [flight], home));
  });
});

describe('prøveflyvninger', () => {
  it('flyver hver dag 1.–23. december', () => {
    for (let d = 1; d <= 23; d++) {
      const f = autoTestFlightForDate(cfg, 2026, 12, d);
      expect(f, `dag ${d}`).not.toBeNull();
      const p = zonedParts(flightStart(f!), 'Europe/Copenhagen');
      expect(p.day).toBe(d);
      expect(p.hour).toBeGreaterThanOrEqual(16);
      expect(p.hour).toBeLessThanOrEqual(19);
    }
  });

  it('flyver ikke på hverdage i november', () => {
    // 2026-11-24 er en tirsdag
    expect(autoTestFlightForDate(cfg, 2026, 11, 24)).toBeNull();
    expect(autoTestFlightForDate(cfg, 2026, 10, 10)).toBeNull();
  });

  it('respekterer aflyste datoer', () => {
    const c2 = { ...cfg, cancelledAutoDates: ['2026-12-05'] };
    expect(autoTestFlightForDate(c2, 2026, 12, 5)).toBeNull();
  });

  it('samler planlagte flyvninger og lader dem vinde over automatiske', () => {
    const from = dk(2026, 11, 28, 0);
    const to = dk(2026, 11, 28, 23, 59);
    const flights = buildSchedule(cfg, from, to);
    const ids = flights.map((f) => f.id);
    expect(ids).toContain('plan-generalproeve');
    expect(ids.some((id) => id.startsWith('auto-2026-11-28'))).toBe(false);
  });

  it('flyveforbud aflyser prøveflyvninger men aldrig juleaften', () => {
    const from = dk(2026, 12, 1);
    const to = dk(2026, 12, 25);
    const flights = buildSchedule(cfg, from, to, { groundedRanges: [[from, to]] });
    expect(flights.map((f) => f.type)).toEqual(['christmas']);
  });

  it('juleflyvningen findes i planen 24. december', () => {
    const t = dk(2026, 12, 24, 19);
    const flights = buildSchedule(cfg, t - 6 * HOUR, t + 6 * HOUR);
    const s = sleighStateAt(t, flights, home);
    expect(s.flight?.type).toBe('christmas');
    expect(['flying', 'visiting']).toContain(s.mode);
  });

  it('planlagte flyvninger har realistiske varigheder', () => {
    const f = buildSchedule(cfg, dk(2026, 12, 10), dk(2026, 12, 10, 23))[0]!;
    const dur = flightEnd(f) - flightStart(f);
    expect(dur).toBeGreaterThan(30 * MINUTE);
    expect(dur).toBeLessThan(5 * HOUR);
  });
});
