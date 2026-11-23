/**
 * Deterministiske tilfældighedsgeneratorer. Alle "tilfældige" hændelser i
 * portalen (logbog, kamerahændelser, vejr, prøveflyvninger) udledes af tid og
 * et frø, så alle besøgende ser præcis det samme på samme tidspunkt.
 */

/** FNV-1a-hash af en tekst til et 32-bit heltal. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 – lille, hurtig og god nok til pynt. Returnerer tal i [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seeded(...parts: (string | number)[]): () => number {
  return mulberry32(hashString(parts.join('|')));
}

/** Ét deterministisk tal i [0, 1) for en nøgle. */
export function rand01(...parts: (string | number)[]): number {
  return seeded(...parts)();
}

export function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length) % list.length]!;
}

export function rangeInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Blander en kopi af listen deterministisk. */
export function shuffled<T>(rng: () => number, list: readonly T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
