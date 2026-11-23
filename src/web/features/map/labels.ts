import { flightEnd, flightStart, type FlightPlan, type SleighState } from '@shared/tracking';

export function modeLabel(s: SleighState): string {
  switch (s.mode) {
    case 'preparing':
      return 'Gør klar til afgang';
    case 'flying':
      return s.nextStop?.kind === 'base' ? 'På vej hjem til Nordpolen' : `På vej mod ${s.nextStop?.name ?? 'næste stop'}`;
    case 'visiting':
      return `Besøger ${s.currentStop?.name ?? ''}`;
    case 'landed':
      return 'Landet sikkert på Nordpolen';
    default:
      return 'Hjemme på Nordpolen';
  }
}

export function modeShort(s: SleighState): { text: string; tone: 'live' | 'ok' | 'info' } {
  switch (s.mode) {
    case 'flying':
      return { text: 'I luften', tone: 'live' };
    case 'visiting':
      return { text: 'Besøger', tone: 'live' };
    case 'preparing':
      return { text: 'Klargøring', tone: 'info' };
    case 'landed':
      return { text: 'Landet', tone: 'ok' };
    default:
      return { text: 'På jorden', tone: 'ok' };
  }
}

/**
 * Hvilken flyvning kortet og tidslinjen skal vise:
 * den aktive → den netop afsluttede (inden for 6 timer) → den næste.
 */
export function displayFlightAt(t: number, s: SleighState, flights: FlightPlan[]): FlightPlan | null {
  if (s.flight) return s.flight;
  const recent = flights.filter((f) => flightEnd(f) <= t && t - flightEnd(f) < 6 * 3600_000).sort((a, b) => flightEnd(b) - flightEnd(a))[0];
  if (recent) return recent;
  return flights.filter((f) => flightStart(f) > t).sort((a, b) => flightStart(a) - flightStart(b))[0] ?? null;
}

/** Breddegrad/længdegrad som 55°40′ N  12°34′ Ø */
export function fmtLatLon(lat: number, lon: number): string {
  const f = (v: number, pos: string, neg: string) => {
    const a = Math.abs(v);
    const d = Math.floor(a);
    const m = Math.floor((a - d) * 60);
    return `${d}°${String(m).padStart(2, '0')}′ ${v >= 0 ? pos : neg}`;
  };
  return `${f(lat, 'N', 'S')}  ${f(lon, 'Ø', 'V')}`;
}
