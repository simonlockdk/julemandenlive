/**
 * Henter flyveplanen fra serveren og stiller kanens tilstand til rådighed.
 * Positionen beregnes lokalt med den delte simuleringsmotor – serveren
 * spørges kun hvert 10. minut (eller når planen løber ud).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiGet, type TrackingResponse } from '../../lib/api';
import { useApp, useNow } from '../../lib/app-context';
import { sleighStateAt, type FlightPlan, type SleighState } from '@shared/tracking';

interface SleighCtx {
  flights: FlightPlan[];
  home: { name: string; lat: number; lon: number };
  ready: boolean;
  error: boolean;
  stateAt: (t: number) => SleighState;
}

const Ctx = createContext<SleighCtx | null>(null);
const DEFAULT_HOME = { name: 'Nordpolen', lat: 89.6, lon: 0 };

export function SleighProvider({ children }: { children: ReactNode }) {
  const { clock, data } = useApp();
  const [res, setRes] = useState<TrackingResponse | null>(null);
  const [error, setError] = useState(false);
  const fetchedAt = useRef(0);

  const load = useCallback(() => {
    fetchedAt.current = clock.now();
    apiGet<TrackingResponse>('/api/tracking')
      .then((r) => {
        setRes(r);
        setError(false);
      })
      .catch(() => setError(true));
  }, [clock]);

  // Vent til bootstrap er klar (så tidsmaskinen er afklaret)
  useEffect(() => {
    if (!data) return;
    load();
    const id = window.setInterval(load, 10 * 60_000);
    return () => window.clearInterval(id);
  }, [data, load]);

  const home = res?.homeBase ?? data?.homeBase ?? DEFAULT_HOME;
  const flights = useMemo(() => res?.flights ?? [], [res]);
  const stateAt = useCallback((t: number) => sleighStateAt(t, flights, home), [flights, home]);

  const value = useMemo(
    () => ({ flights, home, ready: !!res, error, stateAt }),
    [flights, home, res, error, stateAt],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSleigh(): SleighCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSleigh skal bruges inden for SleighProvider');
  return c;
}

/** Kanens tilstand, genberegnet hvert `ms`. */
export function useSleighState(ms = 500): { state: SleighState; now: number } {
  const now = useNow(ms);
  const { stateAt } = useSleigh();
  return { state: stateAt(now), now };
}
