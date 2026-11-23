import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiGet, apiSend } from '../lib/api';
import { useApp } from '../lib/app-context';
import type { DataName, DataOf } from '../../server/schemas';

export interface SaveState {
  saving: boolean;
  message: string | null;
  issues: string[];
  ok: boolean;
}

/** Henter en datafil til redigering og gemmer den igen (med serverens validering). */
export function useAdminData<N extends DataName>(name: N) {
  const { reload } = useApp();
  const [data, setData] = useState<DataOf<N> | null>(null);
  const [original, setOriginal] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>({ saving: false, message: null, issues: [], ok: false });

  const load = useCallback(() => {
    apiGet<DataOf<N>>(`/api/admin/data/${name}`)
      .then((d) => {
        setData(d);
        setOriginal(JSON.stringify(d));
        setLoadError(null);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [name]);

  useEffect(load, [load]);

  const persist = useCallback(
    async (value?: DataOf<N>) => {
      const v = value ?? data;
      if (!v) return false;
      setSave({ saving: true, message: null, issues: [], ok: false });
      try {
        const saved = await apiSend<DataOf<N>>('PUT', `/api/admin/data/${name}`, v);
        setData(saved);
        setOriginal(JSON.stringify(saved));
        setSave({ saving: false, message: 'Gemt! Ændringerne er aktive med det samme.', issues: [], ok: true });
        reload();
        return true;
      } catch (e) {
        const err = e as ApiError;
        setSave({ saving: false, message: err.message, issues: err.issues ?? [], ok: false });
        return false;
      }
    },
    [data, name, reload],
  );

  const dirty = data !== null && JSON.stringify(data) !== original;
  return { data, setData, load, loadError, persist, save, dirty };
}

export function slugId(s: string, fallback = 'ny'): string {
  const id = s
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return id || `${fallback}-${Date.now().toString(36)}`;
}
