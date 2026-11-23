/** Hændelses-overlays og CCTV-effekter (støj, kompressionsblokke, vignet). */
import type { CameraEvent } from '@shared/northpole';
import { H, W, fillRect, gift, hash01, nisse, reindeer, roundRect, type Ctx } from './draw';

/* ---------------- støj ---------------- */

let noiseTiles: HTMLCanvasElement[] | null = null;
function getNoise(): HTMLCanvasElement[] {
  if (noiseTiles) return noiseTiles;
  noiseTiles = Array.from({ length: 4 }, () => {
    const c = document.createElement('canvas');
    c.width = 192;
    c.height = 108;
    const x = c.getContext('2d')!;
    const img = x.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  });
  return noiseTiles;
}

let vignette: CanvasGradient | null = null;
let vignetteCtx: Ctx | null = null;

/** Diskret CCTV-look: korn, scanlines, vignet og af og til kompressionsblokke. */
export function cctv(ctx: Ctx, t: number, strength = 1, transparent = false) {
  const tiles = getNoise();
  const frame = Math.floor(t * 12);
  ctx.save();
  ctx.globalAlpha = (transparent ? 0.05 : 0.07) * strength;
  ctx.globalCompositeOperation = transparent ? 'source-over' : 'overlay';
  ctx.drawImage(tiles[frame % 4]!, 0, 0, W, H);
  ctx.restore();

  // kompressionsartefakter: små forskudte blokke i korte øjeblikke
  if (!transparent && hash01(frame * 0.37) > 0.94) {
    const n = 3 + Math.floor(hash01(frame) * 5);
    for (let i = 0; i < n; i++) {
      const bx = Math.floor(hash01(frame + i * 3.3) * (W / 8)) * 8;
      const by = Math.floor(hash01(frame + i * 7.1) * (H / 8)) * 8;
      const bw = 8 * (1 + Math.floor(hash01(frame + i) * 4));
      try {
        ctx.drawImage(ctx.canvas, bx * (ctx.canvas.width / W), by * (ctx.canvas.height / H), bw * (ctx.canvas.width / W), 8 * (ctx.canvas.height / H), bx + 4, by, bw, 8);
      } catch {
        /* ignorer */
      }
    }
  }

  if (!vignette || vignetteCtx !== ctx) {
    vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    vignetteCtx = ctx;
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

/* ---------------- særlige skærmbilleder ---------------- */

export function noSignal(ctx: Ctx, t: number, label = 'INGEN SIGNAL') {
  const tiles = getNoise();
  ctx.drawImage(tiles[Math.floor(t * 20) % 4]!, 0, 0, W, H);
  fillRect(ctx, 0, 0, W, H, 'rgba(10,20,60,0.35)');
  roundRect(ctx, W / 2 - 80, H / 2 - 18, 160, 36, 4, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, W / 2, H / 2 + 5);
}

export function maintenance(ctx: Ctx, t: number) {
  const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
  bars.forEach((c, i) => fillRect(ctx, (i * W) / 7, 0, W / 7 + 1, H * 0.7, c));
  fillRect(ctx, 0, H * 0.7, W, H * 0.3, '#101010');
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SERVICE – NISSERNE PUDSER LINSEN', W / 2, H * 0.84);
  nisse(ctx, ((t * 30) % (W + 40)) - 20, H * 0.98, 1.1, { walk: t * 8 });
}

/* ---------------- hændelser ---------------- */

const GLITCH_TEXTS = [
  'FEJL 404: NISSE IKKE FUNDET',
  'ADVARSEL: FOR MEGET JULEHYGGE I KREDSLØBET',
  'KAKAO SPILDT PÅ SERVEREN – TØRRER',
  'GENSTARTER JULEMAGI …',
  'RENSDYR SIDDER PÅ ANTENNEN',
];

export function drawEvent(ctx: Ctx, ev: CameraEvent, t: number) {
  const p = ev.progress;
  switch (ev.type) {
    case 'nisse-runs': {
      const dir = ev.seed % 2 ? 1 : -1;
      const x = dir > 0 ? -60 + p * (W + 120) : W + 60 - p * (W + 120);
      ctx.save();
      ctx.globalAlpha = 0.95;
      nisse(ctx, x, H + 10, 4.2, { walk: t * 22, facing: dir as 1 | -1, hat: '#d42a45', carry: ev.seed % 3 === 0 ? 'box' : null, boxColor: '#e3b04b' });
      ctx.restore();
      break;
    }
    case 'lights-out': {
      // lyset dæmpes, er slukket et øjeblik og blinker så tilbage
      let a = p < 0.15 ? p / 0.15 : p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25;
      if (p > 0.72 && p < 0.86) a *= hash01(Math.floor(t * 20)) > 0.5 ? 1 : 0.2;
      fillRect(ctx, 0, 0, W, H, `rgba(0,0,0,${0.94 * a})`);
      if (a > 0.85 && p > 0.3 && p < 0.65) {
        ctx.fillStyle = '#f2c96b';
        ctx.beginPath();
        ctx.arc(W / 2 - 6, H / 2, 2.4, 0, Math.PI * 2);
        ctx.arc(W / 2 + 6, H / 2, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Ups … hvem slukkede lyset?', W / 2, H / 2 + 26);
      }
      break;
    }
    case 'gift-falls': {
      const x = 80 + (ev.seed % 220);
      const fall = Math.min(1, p / 0.45);
      const y = -20 + fall * fall * (H - 30);
      const bounce = p > 0.45 ? Math.abs(Math.sin((p - 0.45) * 14)) * (1 - p) * 30 : 0;
      ctx.save();
      ctx.translate(x, y - bounce);
      ctx.rotate(p * 4);
      gift(ctx, -10, -10, 20, 18, ['#d42a45', '#23905f', '#7fb2ff'][ev.seed % 3]!);
      ctx.restore();
      break;
    }
    case 'reindeer-closeup': {
      // et rensdyr kigger direkte ind i kameraet
      const inOut = p < 0.2 ? p / 0.2 : p > 0.8 ? (1 - p) / 0.2 : 1;
      const dx = (1 - inOut) * 260;
      ctx.save();
      ctx.translate(W / 2 + 40 + dx, H + 140);
      reindeer(ctx, -230, 0, 7.5, { facing: 1, t, nose: ev.seed % 2 === 0 });
      ctx.restore();
      if (inOut === 1 && p > 0.45 && p < 0.6) {
        // dug på linsen fra rensdyrets ånde
        const g = ctx.createRadialGradient(W * 0.62, H * 0.55, 0, W * 0.62, H * 0.55, 90);
        g.addColorStop(0, 'rgba(255,255,255,0.35)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      break;
    }
    case 'signal-loss': {
      noSignal(ctx, t, p < 0.8 ? 'SIGNAL TABT – GENOPRETTER …' : 'SIGNAL GENOPRETTET');
      break;
    }
    case 'tech-glitch': {
      for (let i = 0; i < 8; i++) {
        const y = Math.floor(hash01(Math.floor(t * 15) + i) * H);
        const h = 4 + hash01(i + Math.floor(t * 15)) * 14;
        const shift = (hash01(i * 2 + Math.floor(t * 15)) - 0.5) * 40;
        try {
          ctx.drawImage(ctx.canvas, 0, y * (ctx.canvas.height / H), ctx.canvas.width, h * (ctx.canvas.height / H), shift, y, W, h);
        } catch {
          /* ignorer */
        }
      }
      ctx.fillStyle = 'rgba(255,0,80,0.08)';
      ctx.fillRect(0, 0, W, H);
      roundRect(ctx, 20, H - 46, W - 40, 26, 3, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = '#ff6b7d';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(GLITCH_TEXTS[ev.seed % GLITCH_TEXTS.length]!, W / 2, H - 29);
      break;
    }
    case 'clip':
      // afspilles som video-overlay i komponenten
      break;
  }
}

export const EVENT_LABELS: Record<CameraEvent['type'], string> = {
  'nisse-runs': 'En nisse løb forbi kameraet',
  'lights-out': 'En nisse slukkede lyset',
  'gift-falls': 'En gave faldt af båndet',
  'reindeer-closeup': 'Et rensdyr kiggede ind i kameraet',
  'signal-loss': 'Kortvarigt signaltab',
  'tech-glitch': 'Sjov teknisk fejl i kontrolcentralen',
  clip: 'Særlig hændelse',
};
