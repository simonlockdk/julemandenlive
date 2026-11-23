/**
 * Global app-tilstand: bootstrap-data fra serveren og et ur, der er
 * synkroniseret med serverens tid (så nedtællinger, låger og kanen er ens
 * for alle – også hvis brugerens egen computer går forkert).
 *
 * Tidsmaskine: ?tid=2026-12-24T19:00 (dansk tid) virker for administratorer
 * og i udviklingstilstand. Valget huskes i fanen, indtil det nulstilles.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiGet, setTimeMachineParam, type Bootstrap } from './api';
import { zonedTimeToUtc } from '@shared/time';

interface Clock {
  /** Aktuel "Nordpol-tid" i ms */
  now: () => number;
}

interface AppState {
  data: Bootstrap | null;
  error: string | null;
  clock: Clock;
  timeMachine: { active: boolean; allowed: boolean; reset: () => void; travel: (dkLocal: string) => void };
  reload: () => void;
}

const Ctx = createContext<AppState | null>(null);

const TM_KEY = 'nordpolen:tidsmaskine';

function parseTid(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(s);
  if (!m) return null;
  return zonedTimeToUtc(+m[1]!, +m[2]!, +m[3]!, +(m[4] ?? 12), +(m[5] ?? 0), 0, 'Europe/Copenhagen');
}

function initialTimeMachine(): number | null {
  try {
    const q = new URLSearchParams(window.location.search).get('tid');
    if (q === 'nu' || q === 'reset') {
      sessionStorage.removeItem(TM_KEY);
      return null;
    }
    if (q) {
      const t = parseTid(q);
      if (t !== null) {
        sessionStorage.setItem(TM_KEY, String(t));
        return t;
      }
    }
    const stored = sessionStorage.getItem(TM_KEY);
    return stored ? Number(stored) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  // Ankerpunkt: serverens tid på et kendt performance.now()-tidspunkt
  const anchor = useRef<{ server: number; perf: number }>({ server: Date.now(), perf: performance.now() });
  const tmRequested = useRef<number | null>(initialTimeMachine());

  useEffect(() => {
    let cancelled = false;
    setTimeMachineParam(tmRequested.current);
    const t0 = performance.now();
    apiGet<Bootstrap>('/api/bootstrap')
      .then((b) => {
        if (cancelled) return;
        const t1 = performance.now();
        // Serverens svar svarer omtrent til midten af forespørgslen.
        anchor.current = { server: b.now + (t1 - t0) / 2, perf: t1 };
        if (tmRequested.current !== null && !b.timeMachine.active) {
          // Tidsmaskinen er ikke tilladt (ikke logget ind) – brug rigtig tid.
          tmRequested.current = null;
          setTimeMachineParam(null);
          try {
            sessionStorage.removeItem(TM_KEY);
          } catch {
            /* ok */
          }
        }
        setData(b);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Forbindelsen til Nordpolen er afbrudt. Nisserne arbejder på sagen – prøv igen om lidt.');
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  // Opdater bootstrap (status, begivenheder) hvert 5. minut
  useEffect(() => {
    const id = window.setInterval(() => setNonce((n) => n + 1), 5 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  const now = useCallback(() => anchor.current.server + (performance.now() - anchor.current.perf), []);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(TM_KEY);
    } catch {
      /* ok */
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('tid');
    window.location.replace(url.toString());
  }, []);

  const travel = useCallback((dkLocal: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tid', dkLocal);
    window.location.replace(url.toString());
  }, []);

  const value = useMemo<AppState>(
    () => ({
      data,
      error,
      clock: { now },
      timeMachine: {
        active: !!data?.timeMachine.active,
        allowed: !!data?.timeMachine.allowed,
        reset,
        travel,
      },
      reload: () => setNonce((n) => n + 1),
    }),
    [data, error, now, reset, travel],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp skal bruges inden for AppProvider');
  return c;
}

/** Re-render hvert `ms` og returnér aktuel Nordpol-tid. */
export function useNow(ms = 1000): number {
  const { clock } = useApp();
  const [t, setT] = useState(() => clock.now());
  useEffect(() => {
    setT(clock.now());
    // Justér til hele sekunder, så urene tikker samtidigt
    let id: number;
    const tick = () => {
      setT(clock.now());
      const drift = ms >= 1000 ? ms - (clock.now() % 1000) : ms;
      id = window.setTimeout(tick, Math.max(50, drift));
    };
    id = window.setTimeout(tick, ms >= 1000 ? 1000 - (clock.now() % 1000) : ms);
    return () => window.clearTimeout(id);
  }, [clock, ms]);
  return t;
}
