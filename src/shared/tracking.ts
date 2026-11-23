/**
 * Julemandens magiske flysimulation.
 *
 * Kanens position er en ren funktion af tid + rutedata. Serveren bygger en
 * flyveplan (liste af stop med ankomst- og afgangstider), og både server og
 * browser kan derefter beregne præcis samme position til ethvert tidspunkt.
 * Derfor ser alle besøgende kanen samme sted, og intet starter forfra ved
 * genindlæsning.
 *
 * NB: Der er ingen rigtige GPS-data – det hele er en julemagisk simulation.
 */
import { DK_TZ, DAY, MINUTE, zonedParts, zonedTimeToUtc, weekdayOf } from './time';
import { bearingDeg, distanceKm, interpolateGreatCircle, type LatLon } from './geo';
import { hashString, mulberry32, pick, rangeInt, seeded, shuffled } from './rng';

/* ------------------------------------------------------------------ */
/* Typer                                                               */
/* ------------------------------------------------------------------ */

export interface CityDef {
  name: string;
  country?: string;
  lat: number;
  lon: number;
  /** IANA-tidszone – bruges til juleaftens lokale ankomsttider */
  tz?: string;
  note?: string;
}

export interface RouteStop extends LatLon {
  id: string;
  name: string;
  country?: string;
  kind: 'base' | 'city';
  arrive: number;
  depart: number;
  note?: string;
  /** Byens tidszone (til lokale ankomsttider) */
  tz?: string;
}

export type FlightType = 'test' | 'christmas' | 'special';

export interface FlightPlan {
  id: string;
  type: FlightType;
  title: string;
  description?: string;
  stops: RouteStop[];
}

export interface ScheduledFlight {
  id: string;
  title: string;
  description?: string;
  /** Starttid i dansk tid, "YYYY-MM-DDTHH:mm" */
  start: string;
  speedKmh?: number;
  stopMinutes?: number;
  stops: CityDef[];
  enabled: boolean;
  type?: 'test' | 'special';
}

export interface AutoTestPeriod {
  /** "MM-DD" inklusiv */
  from: string;
  to: string;
  /** Ugedage (0 = søndag); tom = alle */
  weekdays?: number[];
  /** Sandsynlighed for en flyvning på en given dag (0-1) */
  chance?: number;
  windowStart: string; // "HH:mm" dansk tid
  windowEnd: string;
  minStops: number;
  maxStops: number;
}

export interface TrackingConfig {
  homeBase: { name: string; lat: number; lon: number };
  testFlightSpeedKmh: number;
  testStopMinutes: number;
  christmas: {
    enabled: boolean;
    /** Lokal ankomsttid, som byerne sigtes efter, "HH:mm" */
    localTargetTime: string;
    /** Minutter vinduet pr. tidszonebånd varer mindst */
    bandMinutes: number;
    stopMinutes: number;
    cities: CityDef[];
  };
  autoTestFlights: {
    enabled: boolean;
    seed: string;
    periods: AutoTestPeriod[];
    cityPool: CityDef[];
  };
  scheduledFlights: ScheduledFlight[];
  /** Datoer ("YYYY-MM-DD") hvor automatiske prøveflyvninger aflyses */
  cancelledAutoDates: string[];
}

/* ------------------------------------------------------------------ */
/* Hjælpere                                                            */
/* ------------------------------------------------------------------ */

function parseHM(hm: string): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) throw new Error(`Ugyldigt klokkeslæt: ${hm}`);
  return [Number(m[1]), Number(m[2])];
}

/** "YYYY-MM-DDTHH:mm" i dansk tid → UTC-ms. */
export function parseDkLocal(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) throw new Error(`Ugyldig dato: ${s} (forventet ÅÅÅÅ-MM-DDTTT:MM)`);
  return zonedTimeToUtc(+m[1]!, +m[2]!, +m[3]!, +m[4]!, +m[5]!, 0, DK_TZ);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function baseStop(cfg: TrackingConfig, id: string, arrive: number, depart: number): RouteStop {
  return {
    id,
    name: cfg.homeBase.name,
    kind: 'base',
    lat: cfg.homeBase.lat,
    lon: cfg.homeBase.lon,
    arrive,
    depart,
  };
}

/** Rejsetid i ms for en strækning ved en given fart, min. 3 minutter. */
function legMs(a: LatLon, b: LatLon, speedKmh: number): number {
  return Math.max(3 * MINUTE, (distanceKm(a, b) / speedKmh) * 3_600_000);
}

/** Simpel 2-opt-forbedring af en rute med faste endepunkter. */
function twoOpt<T extends LatLon>(pts: T[], fixEnd = true): T[] {
  const route = pts.slice();
  const n = route.length;
  if (n < 4) return route;
  const last = fixEnd ? n - 1 : n;
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 1; i < last - 1; i++) {
      for (let k = i + 1; k < last; k++) {
        const a = route[i - 1]!;
        const b = route[i]!;
        const c = route[k]!;
        const d = route[k + 1];
        const before = distanceKm(a, b) + (d ? distanceKm(c, d) : 0);
        const after = distanceKm(a, c) + (d ? distanceKm(b, d) : 0);
        if (after + 1e-6 < before) {
          route.splice(i, k - i + 1, ...route.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return route;
}

/* ------------------------------------------------------------------ */
/* Prøveflyvninger                                                     */
/* ------------------------------------------------------------------ */

export function buildTestFlight(
  cfg: TrackingConfig,
  opts: {
    id: string;
    title: string;
    description?: string;
    type?: FlightType;
    start: number;
    stops: CityDef[];
    speedKmh?: number;
    stopMinutes?: number;
  },
): FlightPlan {
  const speed = opts.speedKmh ?? cfg.testFlightSpeedKmh;
  const dwell = (opts.stopMinutes ?? cfg.testStopMinutes) * MINUTE;
  const home = cfg.homeBase;
  const stops: RouteStop[] = [baseStop(cfg, `${opts.id}-start`, opts.start - 20 * MINUTE, opts.start)];
  let t = opts.start;
  let prev: LatLon = home;
  opts.stops.forEach((c, i) => {
    t += legMs(prev, c, speed);
    stops.push({
      id: `${opts.id}-${i}-${slug(c.name)}`,
      name: c.name,
      country: c.country,
      kind: 'city',
      lat: c.lat,
      lon: c.lon,
      arrive: t,
      depart: t + dwell,
      note: c.note,
      tz: c.tz,
    });
    t += dwell;
    prev = c;
  });
  t += legMs(prev, home, speed);
  stops.push(baseStop(cfg, `${opts.id}-end`, t, t + 20 * MINUTE));
  return { id: opts.id, type: opts.type ?? 'test', title: opts.title, description: opts.description, stops };
}

const AUTO_TITLES = [
  'Navigationstræning',
  'Prøveflyvning med nye kaneskinner',
  'Test af stjernekompasset',
  'Natteflyvning i formation',
  'Øvelse i præcisionslanding på hustage',
  'Kontrol af julemagisk energi',
  'Rensdyrenes konditionstur',
  'Test af gavesækkens lynlås',
];

const AUTO_DESCRIPTIONS = [
  'Julemanden øver sig i at finde vej i mørke og skyer.',
  'Nisserne har poleret mederne, og nu skal de afprøves i luften.',
  'Rensdyrene træner at flyve tæt sammen, så kanen ligger stabilt.',
  'Kontrolcentralen tester radioforbindelsen mellem kanen og Nordpolen.',
];

function mmdd(month: number, day: number): string {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function inPeriod(md: string, p: AutoTestPeriod): boolean {
  return p.from <= p.to ? md >= p.from && md <= p.to : md >= p.from || md <= p.to;
}

/** Automatiske, deterministiske prøveflyvninger for én dansk kalenderdato. */
export function autoTestFlightForDate(
  cfg: TrackingConfig,
  year: number,
  month: number,
  day: number,
): FlightPlan | null {
  const auto = cfg.autoTestFlights;
  if (!auto.enabled || auto.cityPool.length === 0) return null;
  const dateKey = `${year}-${mmdd(month, day)}`;
  if (cfg.cancelledAutoDates.includes(dateKey)) return null;
  const md = mmdd(month, day);
  const wd = weekdayOf(year, month, day);
  const period = auto.periods.find(
    (p) => inPeriod(md, p) && (!p.weekdays || p.weekdays.length === 0 || p.weekdays.includes(wd)),
  );
  if (!period) return null;
  const rng = seeded('auto', auto.seed, dateKey);
  if (rng() >= (period.chance ?? 1)) return null;

  const [sh, sm] = parseHM(period.windowStart);
  const [eh, em] = parseHM(period.windowEnd);
  const windowMin = Math.max(0, eh * 60 + em - (sh * 60 + sm));
  const offset = Math.floor((rng() * windowMin) / 5) * 5;
  const start = zonedTimeToUtc(year, month, day, sh, sm + offset, 0, DK_TZ);
  const count = rangeInt(rng, period.minStops, Math.max(period.minStops, period.maxStops));
  const picked = shuffled(rng, auto.cityPool).slice(0, Math.min(count, auto.cityPool.length));
  // Rækkefølge: start med byen tættest på Nordpolen og forbedr ruten.
  picked.sort((a, b) => b.lat - a.lat);
  const ordered = twoOpt([cfg.homeBase as LatLon & CityDef, ...picked, cfg.homeBase as LatLon & CityDef]).slice(1, -1);

  return buildTestFlight(cfg, {
    id: `auto-${dateKey}`,
    title: pick(rng, AUTO_TITLES),
    description: pick(rng, AUTO_DESCRIPTIONS),
    start,
    stops: ordered,
  });
}

/* ------------------------------------------------------------------ */
/* Juleaften                                                           */
/* ------------------------------------------------------------------ */

/**
 * Bygger den store juleflyvning.
 *
 * 1. Hver by får en måltid: den lokale klokkeslæt (standard 19:00) i byens
 *    egen tidszone, omregnet til UTC.
 * 2. Byer med samme måltid samles i en "klynge"; klyngerne flyves i
 *    tidsrækkefølge – dvs. aftenen følges fra øst mod vest.
 * 3. Inden for en klynge deles byerne i 15°-længdebånd (øst → vest), og hvert
 *    bånd flyves skiftevis nord→syd og syd→nord, forbedret med 2-opt.
 * 4. Klyngens tidsvindue centreres om måltiden. Hver by får et kort ophold,
 *    og rejsetiden fordeles efter afstand, så farten bliver jævn.
 *
 * Resultat: julemanden kommer forbi omkring kl. 18–20 lokal tid overalt.
 */
export function buildChristmasFlight(cfg: TrackingConfig, year: number): FlightPlan | null {
  const c = cfg.christmas;
  if (!c.enabled || c.cities.length === 0) return null;
  const [th, tm] = parseHM(c.localTargetTime);
  const id = `christmas-${year}`;

  // 1–2: klynger efter måltid
  const clusters = new Map<number, CityDef[]>();
  for (const city of c.cities) {
    const target = zonedTimeToUtc(year, 12, 24, th, tm, 0, city.tz ?? DK_TZ);
    if (!clusters.has(target)) clusters.set(target, []);
    clusters.get(target)!.push(city);
  }
  const targets = [...clusters.keys()].sort((a, b) => a - b);

  const stops: RouteStop[] = [];
  const perCity = 2 * MINUTE;
  const minPerCity = 50_000;
  let prevEnd = -Infinity;
  let prev: LatLon | null = null;
  let direction = 0;

  for (const target of targets) {
    // 3: bånd inden for klyngen
    const bands = new Map<number, CityDef[]>();
    for (const city of clusters.get(target)!) {
      const k = Math.min(23, Math.max(0, Math.floor((180 - city.lon) / 15)));
      if (!bands.has(k)) bands.set(k, []);
      bands.get(k)!.push(city);
    }
    const route: CityDef[] = [];
    for (const k of [...bands.keys()].sort((a, b) => a - b)) {
      let band = bands.get(k)!.slice().sort((a, b) => b.lat - a.lat || b.lon - a.lon);
      if (direction++ % 2 === 1) band.reverse();
      if (band.length >= 4) band = twoOpt(band);
      route.push(...band);
    }

    // 4: tidsvindue
    const n = route.length;
    const span = Math.max(c.bandMinutes * MINUTE, n * perCity);
    const idealStart = target - span / 2;
    const transit = prev ? legMs(prev, route[0]!, 30_000) : 0;
    const start = Math.max(idealStart, prevEnd + transit);
    // Er vi forsinket, komprimeres vinduet i stedet for at skubbe alt senere.
    const end = Math.max(idealStart + span, start + n * minPerCity);
    const available = end - start;
    const dwell = Math.min(c.stopMinutes * MINUTE, (available / n) * 0.35);
    const legs: number[] = [];
    for (let i = 1; i < n; i++) legs.push(distanceKm(route[i - 1]!, route[i]!) + 40);
    const legSum = legs.reduce((s, x) => s + x, 0);
    const travelTotal = available - n * dwell;

    let t = start;
    route.forEach((city, i) => {
      if (i > 0) t += (legs[i - 1]! / legSum) * travelTotal;
      const arrive = Math.round(t);
      stops.push({
        id: `${id}-${slug(city.name)}`,
        name: city.name,
        country: city.country,
        kind: 'city',
        lat: city.lat,
        lon: city.lon,
        arrive,
        depart: Math.round(t + dwell),
        note: city.note,
        tz: city.tz,
      });
      t += dwell;
    });
    prevEnd = stops[stops.length - 1]!.depart;
    prev = route[n - 1]!;
  }

  if (stops.length === 0) return null;
  const first = stops[0]!;
  const depart = first.arrive - legMs(cfg.homeBase, first, 12_000);
  const last = stops[stops.length - 1]!;
  const back = last.depart + legMs(last, cfg.homeBase, 12_000);
  return {
    id,
    type: 'christmas',
    title: `Den store juleflyvning ${year}`,
    description: 'Julemanden flyver jorden rundt fra øst mod vest og følger aftenen gennem tidszonerne.',
    stops: [
      baseStop(cfg, `${id}-start`, depart - 60 * MINUTE, depart),
      ...stops,
      baseStop(cfg, `${id}-end`, back, back + 60 * MINUTE),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Samlet flyveplan                                                    */
/* ------------------------------------------------------------------ */

/** Alle flyvninger, der overlapper tidsrummet [from, to]. */
export function buildSchedule(
  cfg: TrackingConfig,
  from: number,
  to: number,
  opts: { groundedRanges?: [number, number][] } = {},
): FlightPlan[] {
  const flights: FlightPlan[] = [];
  const scheduledDates = new Set<string>();

  for (const sf of cfg.scheduledFlights) {
    if (!sf.enabled) continue;
    try {
      const start = parseDkLocal(sf.start);
      const plan = buildTestFlight(cfg, {
        id: `plan-${sf.id}`,
        title: sf.title,
        description: sf.description,
        type: sf.type ?? 'test',
        start,
        stops: sf.stops,
        speedKmh: sf.speedKmh,
        stopMinutes: sf.stopMinutes,
      });
      const p = zonedParts(start, DK_TZ);
      scheduledDates.add(`${p.year}-${mmdd(p.month, p.day)}`);
      flights.push(plan);
    } catch {
      // en ugyldig planlagt flyvning må aldrig vælte resten af systemet
    }
  }

  // Automatiske prøveflyvninger dag for dag (1.–23. dec. ingen kollision med juleaften)
  for (let t = from - DAY; t <= to + DAY; t += DAY) {
    const p = zonedParts(t, DK_TZ);
    const key = `${p.year}-${mmdd(p.month, p.day)}`;
    if (scheduledDates.has(key)) continue;
    if (p.month === 12 && p.day >= 24) continue;
    const plan = autoTestFlightForDate(cfg, p.year, p.month, p.day);
    if (plan && !flights.some((f) => f.id === plan.id)) flights.push(plan);
  }

  // Juleflyvningen for de år, tidsrummet berører
  const y1 = zonedParts(from, DK_TZ).year;
  const y2 = zonedParts(to, DK_TZ).year;
  for (let y = y1 - 1; y <= y2; y++) {
    const plan = buildChristmasFlight(cfg, y);
    if (plan) flights.push(plan);
  }

  const grounded = opts.groundedRanges ?? [];
  return flights
    .filter((f) => flightStart(f) <= to && flightEnd(f) >= from)
    .filter(
      (f) =>
        f.type === 'christmas' ||
        !grounded.some(([gs, ge]) => flightStart(f) < ge && flightEnd(f) > gs),
    )
    .sort((a, b) => flightStart(a) - flightStart(b));
}

export function flightStart(f: FlightPlan): number {
  return f.stops[0]!.depart;
}
export function flightEnd(f: FlightPlan): number {
  return f.stops[f.stops.length - 1]!.arrive;
}
export function flightDistanceKm(f: FlightPlan): number {
  let d = 0;
  for (let i = 1; i < f.stops.length; i++) d += distanceKm(f.stops[i - 1]!, f.stops[i]!);
  return d;
}

/* ------------------------------------------------------------------ */
/* Position til et tidspunkt                                           */
/* ------------------------------------------------------------------ */

export type SleighMode = 'home' | 'preparing' | 'flying' | 'visiting' | 'landed';

export interface SleighState extends LatLon {
  mode: SleighMode;
  flight: FlightPlan | null;
  /** Kurs i grader (0 = nord) */
  bearing: number;
  speedKmh: number;
  altitudeM: number;
  /** Index for stoppet vi sidst forlod / står ved */
  stopIndex: number;
  prevStop: RouteStop | null;
  nextStop: RouteStop | null;
  currentStop: RouteStop | null;
  /** 0-1 for flyvningen som helhed (efter tid) */
  flightProgress: number;
  legProgress: number;
  nextFlight: FlightPlan | null;
  lastFlight: FlightPlan | null;
}

/** Næsten-lineær lempning med bløde ender. Afledt: 1 − k·cos(2πf). */
const EASE_K = 0.8;
function ease(f: number): number {
  return f - (EASE_K * Math.sin(2 * Math.PI * f)) / (2 * Math.PI);
}
function easeDeriv(f: number): number {
  return 1 - EASE_K * Math.cos(2 * Math.PI * f);
}

export function sleighStateAt(t: number, flights: FlightPlan[], home: LatLon): SleighState {
  const sorted = flights.slice().sort((a, b) => flightStart(a) - flightStart(b));
  const active = sorted.find((f) => t >= f.stops[0]!.arrive && t <= f.stops[f.stops.length - 1]!.depart) ?? null;
  const nextFlight = sorted.find((f) => flightStart(f) > t && f !== active) ?? null;
  const lastFlight = [...sorted].reverse().find((f) => flightEnd(f) < t && f !== active) ?? null;

  const base: SleighState = {
    lat: home.lat,
    lon: home.lon,
    mode: 'home',
    flight: null,
    bearing: 180,
    speedKmh: 0,
    altitudeM: 0,
    stopIndex: 0,
    prevStop: null,
    nextStop: null,
    currentStop: null,
    flightProgress: 0,
    legProgress: 0,
    nextFlight,
    lastFlight,
  };
  if (!active) return base;

  const stops = active.stops;
  const total = flightEnd(active) - flightStart(active);
  const flightProgress = Math.min(1, Math.max(0, (t - flightStart(active)) / total));

  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]!;
    if (t >= s.arrive && t <= s.depart) {
      const isFirst = i === 0;
      const isLast = i === stops.length - 1;
      const next = stops[i + 1] ?? null;
      return {
        ...base,
        lat: s.lat,
        lon: s.lon,
        mode: isFirst ? 'preparing' : isLast ? 'landed' : 'visiting',
        flight: active,
        bearing: next ? bearingDeg(s, next) : 180,
        stopIndex: i,
        prevStop: stops[i - 1] ?? null,
        nextStop: next,
        currentStop: s,
        flightProgress,
        altitudeM: isFirst || isLast ? 0 : 35,
      };
    }
    const next = stops[i + 1];
    if (next && t > s.depart && t < next.arrive) {
      const dur = next.arrive - s.depart;
      const f = (t - s.depart) / dur;
      const e = ease(f);
      const pos = interpolateGreatCircle(s, next, e);
      const ahead = interpolateGreatCircle(s, next, Math.min(1, e + 0.002));
      const dist = distanceKm(s, next);
      const speed = (dist * easeDeriv(f)) / (dur / 3_600_000);
      const cruise = Math.min(10_500, 900 + dist * 1.6);
      const wobble = Math.sin(t / 7000 + hashString(active.id) % 10) * 40;
      const alt = Math.max(0, cruise * Math.pow(Math.sin(Math.PI * f), 0.6) + wobble * Math.sin(Math.PI * f));
      return {
        ...base,
        lat: pos.lat,
        lon: pos.lon,
        mode: 'flying',
        flight: active,
        bearing: e >= 0.998 ? bearingDeg(s, next) : bearingDeg(pos, ahead),
        speedKmh: speed,
        altitudeM: alt,
        stopIndex: i,
        prevStop: s,
        nextStop: next,
        currentStop: null,
        flightProgress,
        legProgress: f,
      };
    }
  }
  return base;
}

/** Til tests og statistik: stop, der er besøgt (afgang passeret) ved t. */
export function visitedStops(f: FlightPlan, t: number): RouteStop[] {
  return f.stops.filter((s) => s.kind === 'city' && s.arrive <= t);
}

/** Deterministisk tilfældigt tal pr. flyvning – fx til "kanens tilstand". */
export function flightRng(f: FlightPlan): () => number {
  return mulberry32(hashString(f.id));
}
