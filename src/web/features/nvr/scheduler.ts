/**
 * Fælles animationsløkke for alle kameraer. Ét requestAnimationFrame for
 * hele siden; hvert kamera tegnes med sin egen (lave) billedfrekvens, og
 * intet tegnes, når fanen er skjult.
 */
type Job = { fn: (now: number) => void; interval: number; last: number };

const jobs = new Set<Job>();
let raf = 0;

function loop(ts: number) {
  raf = jobs.size ? requestAnimationFrame(loop) : 0;
  if (document.hidden) return;
  for (const j of jobs) {
    if (ts - j.last >= j.interval) {
      j.last = ts;
      try {
        j.fn(ts);
      } catch (e) {
        console.error(e);
      }
    }
  }
}

export function schedule(fn: (now: number) => void, fps: number): () => void {
  const job: Job = { fn, interval: 1000 / fps, last: 0 };
  jobs.add(job);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    jobs.delete(job);
    if (!jobs.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
