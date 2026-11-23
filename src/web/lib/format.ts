/** Danske formatteringshjælpere. Alle tider vises i dansk tid. */
import { DK_TZ } from '@shared/time';

const timeFmt = new Intl.DateTimeFormat('da-DK', { timeZone: DK_TZ, hour: '2-digit', minute: '2-digit' });
const timeSecFmt = new Intl.DateTimeFormat('da-DK', {
  timeZone: DK_TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});
const dateFmt = new Intl.DateTimeFormat('da-DK', { timeZone: DK_TZ, weekday: 'long', day: 'numeric', month: 'long' });
const shortDateFmt = new Intl.DateTimeFormat('da-DK', { timeZone: DK_TZ, day: 'numeric', month: 'short' });
const numFmt = new Intl.NumberFormat('da-DK');

/** "19.05" – dansk notation bruger punktum mellem timer og minutter. */
export const fmtTime = (t: number) => timeFmt.format(t);
export const fmtTimeSec = (t: number) => timeSecFmt.format(t);
export const fmtDate = (t: number) => dateFmt.format(t);
export const fmtShortDate = (t: number) => shortDateFmt.format(t);
export const fmtNum = (n: number) => numFmt.format(Math.round(n));

export function fmtTimeIn(t: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat('da-DK', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(t);
  } catch {
    return fmtTime(t);
  }
}

/** "om 2 t 14 min", "om 45 sek." */
export function fmtRelative(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} sek.`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} t ${m % 60} min`;
  return `${Math.floor(h / 24)} dage`;
}

export function fmtDayTime(t: number, now: number): string {
  const d = Math.floor((t - now) / 86_400_000);
  const sameDay = shortDateFmt.format(t) === shortDateFmt.format(now);
  if (sameDay) return `i dag kl. ${fmtTime(t)}`;
  const tomorrow = shortDateFmt.format(t) === shortDateFmt.format(now + 86_400_000);
  if (tomorrow) return `i morgen kl. ${fmtTime(t)}`;
  if (d < 7 && t > now) return `${new Intl.DateTimeFormat('da-DK', { timeZone: DK_TZ, weekday: 'long' }).format(t)} kl. ${fmtTime(t)}`;
  return `${fmtShortDate(t)} kl. ${fmtTime(t)}`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
