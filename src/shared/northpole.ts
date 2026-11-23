/**
 * Nordpolens "levende" data: driftsstatus, logbog, vejr, nissealarmer og
 * kamerahændelser. Alt er fantasi og beregnes deterministisk ud fra tiden,
 * så alle besøgende ser det samme samtidig – uden at serveren skal gemme
 * eller udsende noget.
 */
import { JULEFAKTA, NISSE_NAMES } from './content';
import { pick, rangeInt, seeded } from './rng';
import { DK_TZ, HOUR, MINUTE, dayOfYear, zonedParts } from './time';

/* ------------------------------------------------------------------ */
/* Vejr                                                                */
/* ------------------------------------------------------------------ */

export type SnowLevel = 'ingen' | 'let' | 'moderat' | 'kraftig';

export interface Weather {
  tempC: number;
  windMs: number;
  windDir: number;
  snow: SnowLevel;
  visibilityKm: number;
  auroraChance: number;
  summary: string;
  warning: string | null;
}

function hourlyWeatherRaw(hourIndex: number) {
  const r = seeded('vejr', hourIndex);
  return { temp: r(), wind: r(), dir: r(), snow: r(), aurora: r() };
}

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** Simuleret Nordpol-vejr, jævnt varierende time for time. */
export function northPoleWeather(t: number): Weather {
  const hi = Math.floor(t / HOUR);
  const f = (t - hi * HOUR) / HOUR;
  const a = hourlyWeatherRaw(hi);
  const b = hourlyWeatherRaw(hi + 1);
  const p = zonedParts(t, DK_TZ);
  const doy = dayOfYear(p.year, p.month, p.day);
  // ca. 0 °C midt på sommeren, ca. −30 °C midt på vinteren
  const seasonal = -15 + 15 * Math.cos(((doy - 200) / 365) * 2 * Math.PI);
  const tempC = Math.round((seasonal + lerp(a.temp, b.temp, f) * 10 - 5) * 10) / 10;
  const windMs = Math.round(lerp(a.wind, b.wind, f) ** 1.6 * 19 * 10) / 10 + 1;
  const windDir = Math.round(lerp(a.dir, b.dir, f) * 360);
  const s = lerp(a.snow, b.snow, f);
  const snow: SnowLevel = s < 0.3 ? 'ingen' : s < 0.6 ? 'let' : s < 0.86 ? 'moderat' : 'kraftig';
  const visibilityKm = Math.max(0.3, Math.round((snow === 'kraftig' ? 1.2 : snow === 'moderat' ? 4 : snow === 'let' ? 9 : 25) * (1.2 - windMs / 40) * 10) / 10);
  const auroraChance = snow === 'ingen' ? Math.round(lerp(a.aurora, b.aurora, f) * 100) : Math.round(lerp(a.aurora, b.aurora, f) * 25);

  let summary: string;
  if (snow === 'kraftig') summary = 'Kraftigt snevejr og snefog';
  else if (snow === 'moderat') summary = 'Tæt snevejr';
  else if (snow === 'let') summary = 'Let snefald i frostklar luft';
  else summary = auroraChance > 60 ? 'Klar himmel med nordlys' : 'Klart og stjerneklart';

  let warning: string | null = null;
  if (windMs > 15) warning = 'Kraftig vind: rensdyrene flyver med ekstra tunge hovsko.';
  else if (snow === 'kraftig') warning = 'Snefog: Rudolfs røde næse er tændt for ekstra sigtbarhed.';
  else if (tempC < -38) warning = 'Ekstrem kulde: nisserne har fundet de tykkeste uldhuer frem.';

  return { tempC, windMs, windDir, snow, visibilityKm, auroraChance, summary, warning };
}

/* ------------------------------------------------------------------ */
/* Driftsstatus                                                        */
/* ------------------------------------------------------------------ */

export type StatusLevel = 'ok' | 'info' | 'warn';

export interface StatusItem {
  key: string;
  label: string;
  value: string;
  level: StatusLevel;
  /** 0-100 hvis værdien har en bjælke */
  percent?: number;
}

export interface StatusContext {
  /** Er kanen i luften lige nu? */
  sleighFlying?: boolean;
  /** Admin-overstyringer pr. nøgle */
  overrides?: Record<string, string>;
}

function productionPercent(t: number): number {
  const p = zonedParts(t, DK_TZ);
  if (p.month === 12 && p.day >= 24) return 100;
  const doy = dayOfYear(p.year, p.month, p.day) + p.hour / 24;
  const xmas = dayOfYear(p.year, 12, 24);
  // langsom start i foråret, kraftig stigning i efteråret
  const x = Math.min(1, Math.max(0, doy / xmas));
  return Math.round(Math.min(99.9, 100 * x ** 1.8) * 10) / 10;
}

/** Ønskesedler modtaget i sæsonen – tæller hele tiden op. */
export function wishlistsReceived(t: number): number {
  const p = zonedParts(t, DK_TZ);
  const seasonStart = Date.UTC(p.month === 12 && p.day > 24 ? p.year : p.year - 1, 11, 25);
  const days = Math.max(0, (t - seasonStart) / (24 * HOUR));
  // eksponentielt stigende mod jul – men altid deterministisk
  return Math.floor(1200 * days + 18 * days ** 2.4);
}

export function northPoleStatus(t: number, ctx: StatusContext = {}): StatusItem[] {
  const p = zonedParts(t, DK_TZ);
  const slot = Math.floor(t / (30 * MINUTE));
  const r = seeded('status', slot);
  const h = p.hour + p.minute / 60;
  const weather = northPoleWeather(t);

  const moods = ['Fremragende', 'Strålende', 'Legesyge', 'Glade og mætte', 'Lidt søvnige', 'Ivrige efter at flyve'];
  const night = h < 6 || h >= 22;
  const lunch = h >= 12 && h < 13;
  const workshop = night ? 'Nattevagt (stille arbejde)' : lunch ? 'Frokostpause – risalamande' : 'Fuld aktivitet';
  const elves = Math.round(4287 + Math.sin(((h - 4) / 24) * 2 * Math.PI) * 900 + (r() - 0.5) * 120 - (night ? 1500 : 0));
  const magic = Math.min(100, Math.round(88 + productionPercent(t) / 10 + (r() - 0.5) * 3));
  const prod = productionPercent(t);
  const giftsToday = Math.floor(((h * 60) / (24 * 60)) * 1_850_000 * (0.4 + prod / 160));

  const items: StatusItem[] = [
    { key: 'production', label: 'Gaveproduktion', value: `${prod.toLocaleString('da-DK')} %`, level: 'ok', percent: prod },
    { key: 'mood', label: 'Rensdyrenes humør', value: pick(r, moods), level: 'ok' },
    { key: 'cinnamon', label: 'Kanellager', value: r() > 0.12 ? 'Fyldt op' : 'Ny levering på vej', level: 'ok' },
    { key: 'workshop', label: 'Værkstedsstatus', value: workshop, level: night ? 'info' : 'ok' },
    { key: 'elves', label: 'Nisser på arbejde', value: Math.max(900, elves).toLocaleString('da-DK'), level: 'ok' },
    {
      key: 'engine',
      label: 'Kanens motorstatus',
      value: ctx.sleighFlying ? 'I luften – alt kører' : h >= 7 && h < 9 ? 'Morgenservice' : 'Klar',
      level: ctx.sleighFlying ? 'info' : 'ok',
    },
    { key: 'nose', label: 'Rudolfs røde næse', value: weather.snow === 'kraftig' ? 'Lyser ekstra kraftigt' : 'Lyser normalt', level: 'ok' },
    { key: 'weather', label: 'Nordpolens vejr', value: `${weather.summary}, ${weather.tempC.toLocaleString('da-DK')} °C`, level: weather.warning ? 'warn' : 'ok' },
    { key: 'magic', label: 'Julemagisk energi', value: `${magic} %`, level: 'ok', percent: magic },
    { key: 'gifts', label: 'Gaver pakket i dag', value: giftsToday.toLocaleString('da-DK'), level: 'ok' },
    { key: 'wishlists', label: 'Ønskesedler modtaget', value: wishlistsReceived(t).toLocaleString('da-DK'), level: 'ok' },
  ];
  const ov = ctx.overrides ?? {};
  return items.map((it) => (ov[it.key] ? { ...it, value: ov[it.key]!, percent: parsePercent(ov[it.key]!) ?? it.percent } : it));
}

function parsePercent(s: string): number | undefined {
  const m = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(s.trim());
  return m ? Math.min(100, Number(m[1]!.replace(',', '.'))) : undefined;
}

/* ------------------------------------------------------------------ */
/* Logbog                                                              */
/* ------------------------------------------------------------------ */

export interface LogEntry {
  id: string;
  t: number;
  text: string;
  category: 'værksted' | 'stald' | 'kane' | 'kontor' | 'sjov' | 'vejr' | 'system';
}

const LOG_TEMPLATES: { c: LogEntry['category']; t: string }[] = [
  { c: 'værksted', t: '{n} har bygget {k} træheste på rekordtid.' },
  { c: 'værksted', t: 'Samlebånd 3 kører igen, efter at {n} fjernede en fastklemt bamse.' },
  { c: 'værksted', t: '{n} har malet {k} legetøjstog røde. Det sidste blev ved et uheld stribet.' },
  { c: 'værksted', t: 'Kvalitetskontrol: {k} dukker har fået nye sko og bestået testen.' },
  { c: 'værksted', t: '{n} og {m} er uenige om, hvilken farve sløjfer skal have i år.' },
  { c: 'stald', t: 'Rensdyrene har spist {k} kg gulerødder siden morgenstunden.' },
  { c: 'stald', t: 'Stjerneskud er igen fundet i høstakken. Han siger, han "øvede landing".' },
  { c: 'stald', t: 'Danser holdt fest i stalden. Torden faldt i søvn midt i sangen.' },
  { c: 'stald', t: '{n} har børstet alle rensdyrenes pels. Lyn insisterede på at få to omgange.' },
  { c: 'kane', t: 'Kanens meder er poleret til spejlglans af {n}.' },
  { c: 'kane', t: 'Bjælderne på kanen er stemt. De spiller nu en perfekt C-dur.' },
  { c: 'kane', t: '{n} har testet kanens sædevarme: "Hyggeligt varm".' },
  { c: 'kane', t: 'Gavesækkens lynlås er smurt og testet {k} gange.' },
  { c: 'kontor', t: 'Julemanden har læst {k} ønskesedler. Mange ønsker sig noget med dinosaurer.' },
  { c: 'kontor', t: 'Julemanden har fået ny kop kakao. Den forrige blev kold, mens han læste.' },
  { c: 'kontor', t: 'Verdenskortet på kontoret har fået {k} nye nåle for nye adresser.' },
  { c: 'kontor', t: 'Julemanden øvede sit "Ho ho ho" – nisserne gav det 10 ud af 10.' },
  { c: 'sjov', t: '{n} er blevet set med en hel bakke småkager på vej mod CAM08.' },
  { c: 'sjov', t: 'Nogen har pyntet snemanden på gårdspladsen med {n}s hue.' },
  { c: 'sjov', t: '{n} har fundet en sok, der har været væk siden sidste jul.' },
  { c: 'sjov', t: 'Kaffemaskinen i værkstedet laver nu kun varm kakao. Ingen klager.' },
  { c: 'sjov', t: 'Der er stadig ingen, der tilstår at have spist den sidste pebernød.' },
  { c: 'vejr', t: 'Nissernes vejrstation måler {k} cm nysne på gårdspladsen.' },
  { c: 'system', t: 'Kontrolcentralen har kalibreret stjernekompasset. Afvigelse: 0,00 nissemeter.' },
  { c: 'system', t: 'Julemagisk energi genopfyldt fra nordlyset.' },
  { c: 'system', t: 'Kamera {cam} er pudset af {n}. Billedet er nu krystalklart (næsten).' },
];

const LOG_SLOT = 4 * MINUTE;

function entryForSlot(slot: number): LogEntry | null {
  const r = seeded('log', slot);
  if (r() > 0.72) return null;
  const tpl = pick(r, LOG_TEMPLATES);
  const n = pick(r, NISSE_NAMES);
  let m = pick(r, NISSE_NAMES);
  if (m === n) m = NISSE_NAMES[(NISSE_NAMES.indexOf(n) + 3) % NISSE_NAMES.length]!;
  const text = tpl.t
    .replace('{n}', n)
    .replace('{m}', m)
    .replace('{k}', String(rangeInt(r, 3, 480)))
    .replace('{cam}', `CAM0${rangeInt(r, 1, 8)}`);
  return { id: `log-${slot}`, t: slot * LOG_SLOT + Math.floor(r() * LOG_SLOT * 0.9), text, category: tpl.c };
}

/** De seneste `count` logbogsposter op til tidspunkt t (nyeste først). */
export function logEntries(t: number, count = 12): LogEntry[] {
  const out: LogEntry[] = [];
  let slot = Math.floor(t / LOG_SLOT);
  for (let guard = 0; out.length < count && guard < count * 6; guard++, slot--) {
    const e = entryForSlot(slot);
    if (e && e.t <= t) out.push(e);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Dagens julefakta                                                    */
/* ------------------------------------------------------------------ */

export function factOfTheDay(t: number): { index: number; text: string } {
  const p = zonedParts(t, DK_TZ);
  const index = (dayOfYear(p.year, p.month, p.day) + p.year) % JULEFAKTA.length;
  return { index, text: JULEFAKTA[index]! };
}

/* ------------------------------------------------------------------ */
/* Nissealarm                                                          */
/* ------------------------------------------------------------------ */

export interface NisseAlarm {
  id: string;
  t: number;
  title: string;
  text: string;
  /** Kamera, der relaterer sig til alarmen, fx "cam08" */
  camera?: string;
}

const ALARMS: Omit<NisseAlarm, 'id' | 't'>[] = [
  { title: 'Nissealarm!', text: 'En nisse er set med hånden i kagedåsen på julemandens kontor.', camera: 'cam06' },
  { title: 'Nissealarm!', text: 'Der er sne i pakkemaskinen. Nisserne skovler alt, hvad de kan.', camera: 'cam04' },
  { title: 'Nissealarm!', text: 'Stjerneskud er stukket af fra træningsbanen – igen.', camera: 'cam07' },
  { title: 'Nissealarm!', text: 'Noget mystisk rører sig på det hemmelige nissekamera…', camera: 'cam08' },
  { title: 'Nissealarm!', text: 'En gave er rullet af samlebåndet. Hvem fanger den?', camera: 'cam01' },
  { title: 'Kontrolcentralen meddeler', text: 'Kanen har fået nye bjælder. De kan høres helt til Grønland.', camera: 'cam03' },
  { title: 'Nissealarm!', text: 'Rensdyrene har opdaget en ny sæk gulerødder.', camera: 'cam02' },
  { title: 'Nissealarm!', text: 'Snebolde set over gårdspladsen! Alle nisser i dækning.', camera: 'cam05' },
];

const ALARM_SLOT = 7 * MINUTE;

/** Er der en aktiv nissealarm på tidspunkt t? Varer 25 sekunder. */
export function nisseAlarmAt(t: number): NisseAlarm | null {
  const slot = Math.floor(t / ALARM_SLOT);
  const r = seeded('alarm', slot);
  if (r() > 0.4) return null;
  const start = slot * ALARM_SLOT + Math.floor(r() * (ALARM_SLOT - 30_000));
  if (t < start || t > start + 25_000) return null;
  return { id: `alarm-${slot}`, t: start, ...pick(r, ALARMS) };
}

/* ------------------------------------------------------------------ */
/* Kamerahændelser                                                     */
/* ------------------------------------------------------------------ */

export type CameraEventType =
  | 'nisse-runs'
  | 'lights-out'
  | 'gift-falls'
  | 'reindeer-closeup'
  | 'signal-loss'
  | 'tech-glitch'
  | 'clip';

export const CAMERA_EVENT_DURATION: Record<CameraEventType, number> = {
  'nisse-runs': 4200,
  'lights-out': 6000,
  'gift-falls': 5000,
  'reindeer-closeup': 8000,
  'signal-loss': 3500,
  'tech-glitch': 4500,
  clip: 12_000,
};

export interface CameraEventConfig {
  enabled: boolean;
  perHour: number;
  types: CameraEventType[];
  /** Til 'clip'-hændelser: videoklip, der afspilles som overlay */
  clips?: { src: string; label?: string; durationMs?: number }[];
}

export interface CameraEvent {
  type: CameraEventType;
  start: number;
  end: number;
  /** 0-1 hvor langt hændelsen er */
  progress: number;
  clip?: { src: string; label?: string };
  seed: number;
}

/** Aktiv hændelse for et kamera på tidspunkt t (eller null). */
export function cameraEventAt(cameraId: string, t: number, cfg: CameraEventConfig | undefined): CameraEvent | null {
  if (!cfg || !cfg.enabled || cfg.perHour <= 0 || cfg.types.length === 0) return null;
  const slotMs = HOUR / cfg.perHour;
  for (const slot of [Math.floor(t / slotMs), Math.floor(t / slotMs) - 1]) {
    const r = seeded('cam', cameraId, slot);
    const type = pick(r, cfg.types);
    const clip = type === 'clip' && cfg.clips?.length ? pick(r, cfg.clips) : undefined;
    if (type === 'clip' && !clip) continue;
    const dur = clip?.durationMs ?? CAMERA_EVENT_DURATION[type];
    const start = Math.floor(slot * slotMs + r() * Math.max(0, slotMs - dur));
    if (t >= start && t < start + dur) {
      return { type, start, end: start + dur, progress: (t - start) / dur, clip, seed: Math.floor(r() * 1e9) };
    }
  }
  return null;
}

/** Næste hændelse for et kamera efter t (til admin-preview og tests). */
export function nextCameraEvent(cameraId: string, t: number, cfg: CameraEventConfig, maxSlots = 50): CameraEvent | null {
  const slotMs = HOUR / cfg.perHour;
  for (let s = Math.floor(t / slotMs); s < Math.floor(t / slotMs) + maxSlots; s++) {
    const r = seeded('cam', cameraId, s);
    const type = pick(r, cfg.types);
    if (type === 'clip' && !cfg.clips?.length) continue;
    const clip = type === 'clip' ? pick(r, cfg.clips!) : undefined;
    const dur = clip?.durationMs ?? CAMERA_EVENT_DURATION[type];
    const start = Math.floor(s * slotMs + r() * Math.max(0, slotMs - dur));
    if (start >= t) return { type, start, end: start + dur, progress: 0, clip, seed: 0 };
  }
  return null;
}

/** Alle hændelser for et kamera i tidsrummet [from, to] (til hændelsesloggen). */
export function cameraEventsBetween(cameraId: string, from: number, to: number, cfg: CameraEventConfig | undefined): CameraEvent[] {
  if (!cfg || !cfg.enabled || cfg.perHour <= 0 || cfg.types.length === 0) return [];
  const slotMs = HOUR / cfg.perHour;
  const out: CameraEvent[] = [];
  for (let s = Math.floor(from / slotMs) - 1; s <= Math.floor(to / slotMs); s++) {
    const r = seeded('cam', cameraId, s);
    const type = pick(r, cfg.types);
    const clip = type === 'clip' && cfg.clips?.length ? pick(r, cfg.clips) : undefined;
    if (type === 'clip' && !clip) continue;
    const dur = clip?.durationMs ?? CAMERA_EVENT_DURATION[type];
    const start = Math.floor(s * slotMs + r() * Math.max(0, slotMs - dur));
    if (start >= from && start <= to) out.push({ type, start, end: start + dur, progress: 0, clip, seed: Math.floor(r() * 1e9) });
  }
  return out;
}
