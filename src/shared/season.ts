/**
 * Kalenderlogik for julesæsonen: adventssøndage, nedtællinger,
 * julekalenderens låger og portalens overordnede sæsontilstand.
 * Alle datoer følger dansk tid.
 */
import { DK_TZ, compareDates, dkMidnight, weekdayOf, zonedParts, type ZonedParts } from './time';

export interface SimpleDate {
  year: number;
  month: number;
  day: number;
}

/* ------------------------------------------------------------------ */
/* Advent                                                              */
/* ------------------------------------------------------------------ */

/**
 * De fire adventssøndage for et år. 4. advent er den sidste søndag
 * på eller før 24. december; de øvrige ligger en uge før hinanden.
 */
export function adventSundays(year: number): SimpleDate[] {
  const wd24 = weekdayOf(year, 12, 24);
  const fourthDay = 24 - wd24; // wd24 = 0 → 24. december er selv 4. advent
  const fourth = Date.UTC(year, 11, fourthDay);
  return [3, 2, 1, 0].map((weeksBack) => {
    const d = new Date(fourth - weeksBack * 7 * 86_400_000);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
  });
}

export const ADVENT_MESSAGES = [
  'Første lys er tændt. Nu begynder ventetiden – find tæpperne og kakaoen frem.',
  'To lys brænder. Nisserne siger, at pebernødderne er ekstra gode i år.',
  'Tre lys! Værkstedet arbejder på højtryk, og rensdyrene øver hver aften.',
  'Alle fire lys er tændt. Nu er der ikke længe til juleaften!',
];

export interface AdventState {
  /** Antal tændte lys 0-4 ifølge kalenderen */
  lit: number;
  sundays: SimpleDate[];
  /** Næste adventssøndag, hvis der er en i år */
  next: SimpleDate | null;
  message: string;
}

/**
 * Hvor mange adventslys der skal være tændt på et tidspunkt.
 * Lysene bliver ved med at brænde til og med 2. juledag; derefter
 * slukkes kransen, til næste års 1. advent.
 */
export function adventState(now: number): AdventState {
  const p = zonedParts(now, DK_TZ);
  const sundays = adventSundays(p.year);
  const today: SimpleDate = { year: p.year, month: p.month, day: p.day };
  let lit = sundays.filter((s) => compareDates(s, today) <= 0).length;
  const afterJuledage = p.month === 12 && p.day > 26;
  if (afterJuledage) lit = 0;
  const next = afterJuledage ? null : (sundays.find((s) => compareDates(s, today) > 0) ?? null);
  let message: string;
  if (afterJuledage) message = 'Kransen hviler til næste år. Tak for en dejlig advent!';
  else if (lit === 0) message = 'Kransen er klar. Første lys tændes 1. søndag i advent.';
  else message = ADVENT_MESSAGES[lit - 1]!;
  return { lit, sundays, next, message };
}

/* ------------------------------------------------------------------ */
/* Nedtællinger                                                        */
/* ------------------------------------------------------------------ */

export interface Remaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function splitRemaining(ms: number): Remaining {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  return {
    totalMs: total,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export interface CountdownState {
  /** "counting": der tælles ned; "reached": dagen/perioden er nået */
  phase: 'counting' | 'reached';
  /** Tidspunktet der tælles ned til (næste forekomst) */
  target: number;
  targetYear: number;
  remaining: Remaining;
  /** Sand i dagene lige efter perioden, hvor sæsonens afslutning markeres */
  afterglow: boolean;
}

/**
 * Generisk årlig nedtælling til midnat på en dansk kalenderdato.
 * - `reachedDays`: hvor mange dage "nået"-tilstanden varer (inkl. selve dagen)
 * - `afterglowDays`: dage efter perioden, hvor afslutning markeres, mens
 *   der allerede tælles ned til næste år.
 */
export function annualCountdown(
  now: number,
  month: number,
  day: number,
  reachedDays = 1,
  afterglowDays = 0,
): CountdownState {
  const { year } = zonedParts(now, DK_TZ);
  const startThis = dkMidnight(year, month, day);
  const endThis = dkMidnight(year, month, day + reachedDays);
  const glowEnd = dkMidnight(year, month, day + reachedDays + afterglowDays);

  if (now >= startThis && now < endThis) {
    return { phase: 'reached', target: startThis, targetYear: year, remaining: splitRemaining(0), afterglow: false };
  }
  // Datoen kan også være nået i "sidste års" periode, hvis den krydser nytår.
  const startPrev = dkMidnight(year - 1, month, day);
  const endPrev = dkMidnight(year - 1, month, day + reachedDays);
  if (now >= startPrev && now < endPrev) {
    return { phase: 'reached', target: startPrev, targetYear: year - 1, remaining: splitRemaining(0), afterglow: false };
  }
  const targetYear = now < startThis ? year : year + 1;
  const target = dkMidnight(targetYear, month, day);
  const glowPrev = dkMidnight(year - 1, month, day + reachedDays + afterglowDays);
  const afterglow = (now >= endThis && now < glowEnd) || (now >= endPrev && now < glowPrev);
  return { phase: 'counting', target, targetYear, remaining: splitRemaining(target - now), afterglow };
}

/** Nedtælling til 1. december. "Nået" varer hele kalenderperioden 1.–24. december. */
export function countdownToDecember(now: number): CountdownState {
  return annualCountdown(now, 12, 1, 24, 0);
}

/** Nedtælling til juleaften. "Nået" hele den 24.; afslutning markeres 25.–31. december. */
export function countdownToChristmasEve(now: number): CountdownState {
  return annualCountdown(now, 12, 24, 1, 7);
}

/* ------------------------------------------------------------------ */
/* Julekalender                                                        */
/* ------------------------------------------------------------------ */

/**
 * Er låge nr. `door` (1-24) åben? Lågerne åbner kl. 00:00 dansk tid på
 * den pågældende decemberdato. Efter juleaften kan hele kalenderen ses
 * resten af december; fra januar til november er den lukket.
 */
export function isDoorUnlocked(door: number, now: number): boolean {
  const p = zonedParts(now, DK_TZ);
  if (p.month !== 12) return false;
  return p.day >= door;
}

/** Hvilket lågenummer der er "dagens" (1-24), eller null udenfor perioden. */
export function todaysDoor(now: number): number | null {
  const p = zonedParts(now, DK_TZ);
  return p.month === 12 && p.day <= 24 ? p.day : null;
}

/* ------------------------------------------------------------------ */
/* Sæsontilstand                                                       */
/* ------------------------------------------------------------------ */

export type SeasonMode =
  /** 25. dec – 30. sep: juleflyvningen er afsluttet, julemanden hviler */
  | 'completed'
  /** 1. okt – 30. nov: forberedelser og enkelte planlagte prøveflyvninger */
  | 'preparation'
  /** 1. – 23. dec: testflyvninger og navigationstræning */
  | 'advent'
  /** 24. dec: den store juleflyvning */
  | 'christmas-eve';

export function seasonMode(now: number): SeasonMode {
  const p: ZonedParts = zonedParts(now, DK_TZ);
  if (p.month === 12) {
    if (p.day <= 23) return 'advent';
    if (p.day === 24) return 'christmas-eve';
    return 'completed';
  }
  if (p.month >= 10) return 'preparation';
  return 'completed';
}

export const SEASON_LABELS: Record<SeasonMode, { title: string; text: string }> = {
  completed: {
    title: 'Juleflyvningen er afsluttet',
    text: 'Julemanden er landet sikkert på Nordpolen og hviler sine trætte ben. Rensdyrene har fri.',
  },
  preparation: {
    title: 'Forberedelser i gang',
    text: 'Julemanden er på Nordpolen. Kanen bliver gjort klar, og der kan forekomme planlagte prøveflyvninger.',
  },
  advent: {
    title: 'Testflyvninger i december',
    text: 'Julemanden øver navigation og tester kanen på korte flyvninger. Hold øje med kortet!',
  },
  'christmas-eve': {
    title: 'Den store juleflyvning',
    text: 'Det er juleaften! Julemanden flyver jorden rundt og besøger byerne omkring kl. 18–20 lokal tid.',
  },
};
