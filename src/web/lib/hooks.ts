import { useEffect, useRef, useState, type RefObject } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReduced(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return reduced;
}

export function useMediaQuery(q: string): boolean {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(q).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(q);
    const fn = () => setM(mq.matches);
    mq.addEventListener('change', fn);
    fn();
    return () => mq.removeEventListener('change', fn);
  }, [q]);
  return m;
}

/** Er siden synlig (fanen i forgrunden)? */
export function usePageVisible(): boolean {
  const [v, setV] = useState(() => (typeof document !== 'undefined' ? !document.hidden : true));
  useEffect(() => {
    const fn = () => setV(!document.hidden);
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }, []);
  return v;
}

/** Er elementet synligt i viewporten? Bruges til lazy loading af kameraer. */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = '120px'): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

export function useInterval(fn: () => void, ms: number | null) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    if (ms === null) return;
    const id = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(id);
  }, [ms]);
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Nordpolens Kontrolcentral` : 'Nordpolens Kontrolcentral – følg julemanden og nisserne';
  }, [title]);
}
