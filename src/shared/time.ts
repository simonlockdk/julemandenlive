/**
 * Tidszonehjælpere. Alt i portalen regnes i dansk tid (Europe/Copenhagen),
 * men koden virker for enhver IANA-tidszone – det bruges bl.a. til at beregne
 * julemandens ankomsttider i byer verden over.
 *
 * Bygger kun på Intl, så den samme kode kører i Node og i browseren.
 */

export const DK_TZ = 'Europe/Copenhagen';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  second: number;
  /** 0 = søndag … 6 = lørdag */
  weekday: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Kalenderdato og klokkeslæt for et tidspunkt i en given tidszone. */
export function zonedParts(t: number | Date, tz: string = DK_TZ): ZonedParts {
  const ms = typeof t === 'number' ? t : t.getTime();
  const parts = formatterFor(tz).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS[get('weekday')] ?? 0,
  };
}

/** Tidszonens forskydning fra UTC i millisekunder på et givet tidspunkt. */
export function tzOffsetMs(t: number, tz: string = DK_TZ): number {
  const p = zonedParts(t, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(t / 1000) * 1000;
}

/**
 * Omregner en lokal "vægur-tid" i en tidszone til et UTC-tidsstempel.
 * Håndterer sommertid ved at justere forskydningen iterativt.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  tz: string = DK_TZ,
): number {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = naive - tzOffsetMs(naive, tz);
  // Anden iteration fanger tilfælde, hvor forskydningen skifter omkring tidspunktet.
  const second2 = naive - tzOffsetMs(guess, tz);
  if (second2 !== guess) guess = second2;
  return guess;
}

/** Midnat (start af dagen) i dansk tid for en bestemt kalenderdato. */
export function dkMidnight(year: number, month: number, day: number): number {
  return zonedTimeToUtc(year, month, day, 0, 0, 0, DK_TZ);
}

/** Antal hele kalenderdage mellem to datoer (uden tidszonestøj). */
export function daysBetweenDates(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number {
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY,
  );
}

/** Ugedag (0 = søndag) for en ren kalenderdato. */
export function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Sammenlign to kalenderdatoer: negativ hvis a < b. */
export function compareDates(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Fortløbende dagnummer i året (1-366) for en kalenderdato. */
export function dayOfYear(year: number, month: number, day: number): number {
  return daysBetweenDates({ year, month: 1, day: 1 }, { year, month, day }) + 1;
}
