/**
 * "Find den skjulte nisse": små nisser gemt rundt omkring på siden.
 * Fundne nisser gemmes kun lokalt i browseren.
 */
import { createContext, useCallback, useContext, useState, type CSSProperties, type ReactNode } from 'react';
import { NisseFigure } from './Art';
import { useStored } from '../lib/storage';
import { useApp } from '../lib/app-context';

export const HIDDEN_NISSER: { id: string; name: string; hint: string }[] = [
  { id: 'logo', name: 'Pjok', hint: 'Han elsker at sidde tæt på Nordpolens emblem.' },
  { id: 'kort', name: 'Tulle', hint: 'Hun holder øje med kortet – men hvor?' },
  { id: 'krans', name: 'Gnidrik', hint: 'Han varmer sig ved adventslysene.' },
  { id: 'status', name: 'Pusling', hint: 'Hun tjekker driftsstatus hele dagen.' },
  { id: 'logbog', name: 'Tøffe', hint: 'Han skriver i logbogen, når ingen kigger.' },
  { id: 'footer', name: 'Klokke-Karl', hint: 'Han hviler sig nederst på siden.' },
  { id: 'nvr', name: 'Fidus', hint: 'Han passer på overvågningscentralen.' },
  { id: 'kalender', name: 'Mille Mus', hint: 'Hun gemmer sig ved lågerne.' },
  { id: 'rensdyr', name: 'Bjelle-Bent', hint: 'Han børster rensdyrene.' },
  { id: 'missioner', name: 'Snefnug-Sofie', hint: 'Hun har sin egen mission.' },
  { id: 'vejr', name: 'Vims', hint: 'Han måler sne og vind.' },
  { id: 'journal', name: 'Lune', hint: 'Hun fører kanens flyvejournal.' },
];

interface FoundCtx {
  found: string[];
  markFound: (id: string) => void;
  lastFound: { id: string; name: string; at: number } | null;
}

const Ctx = createContext<FoundCtx>({ found: [], markFound: () => undefined, lastFound: null });

export function HiddenNisseProvider({ children }: { children: ReactNode }) {
  const [found, setFound] = useStored<string[]>('fundne-nisser', []);
  const [lastFound, setLastFound] = useState<FoundCtx['lastFound']>(null);
  const markFound = useCallback(
    (id: string) => {
      const n = HIDDEN_NISSER.find((x) => x.id === id);
      if (!n) return;
      setFound((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setLastFound({ id, name: n.name, at: Date.now() });
    },
    [setFound],
  );
  return <Ctx.Provider value={{ found, markFound, lastFound }}>{children}</Ctx.Provider>;
}

export const useHiddenNisser = () => useContext(Ctx);

export function HiddenNisse({ id, style, variant }: { id: string; style?: CSSProperties; variant?: number }) {
  const { found, markFound } = useHiddenNisser();
  const { data } = useApp();
  const [pop, setPop] = useState(false);
  if (data && !data.site.features.hiddenNisser) return null;
  const meta = HIDDEN_NISSER.find((n) => n.id === id);
  if (!meta) return null;
  const isFound = found.includes(id);
  return (
    <button
      type="button"
      className={`hidden-nisse${pop ? ' pop' : ''}`}
      style={style}
      data-found={isFound}
      aria-label={isFound ? `${meta.name} – allerede fundet` : 'En skjult nisse! Klik for at finde den'}
      title={isFound ? `${meta.name} er fundet` : undefined}
      onClick={() => {
        markFound(id);
        setPop(true);
        window.setTimeout(() => setPop(false), 700);
      }}
    >
      <NisseFigure variant={variant ?? HIDDEN_NISSER.indexOf(meta)} />
    </button>
  );
}
