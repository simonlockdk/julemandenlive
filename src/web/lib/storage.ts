/**
 * Sikker localStorage-adgang. Alt, hvad besøgende gemmer (åbnede låger,
 * ønskeseddel, fundne nisser), bliver kun i browseren. Fejler lagringen
 * (privat vindue, blokeret), virker siden stadig – den husker bare ikke.
 */
import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'nordpolen:';
const listeners = new Map<string, Set<() => void>>();

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignorer – siden virker uden lagring */
  }
  listeners.get(key)?.forEach((fn) => fn());
}

/** useState, der gemmes i localStorage og deles mellem komponenter. */
export function useStored<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStore(key, fallback));

  useEffect(() => {
    const fn = () => setValue(readStore(key, fallback));
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFIX + key) fn();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.get(key)?.delete(fn);
      window.removeEventListener('storage', onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(readStore(key, fallback)) : v;
      writeStore(key, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set];
}
