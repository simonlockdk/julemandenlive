/**
 * Tegnehjælpere til de animerede kamerascener. Alt tegnes i et logisk
 * koordinatsystem på 384×216 og skaleres op. Al bevægelse afledes af den
 * absolutte tid, så alle besøgende ser præcis det samme billede.
 */
export const W = 384;
export const H = 216;

export type Ctx = CanvasRenderingContext2D;

export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function vgrad(ctx: Ctx, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function fillRect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string | CanvasGradient) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Træplanker som væg eller gulv. */
export function planks(ctx: Ctx, x: number, y: number, w: number, h: number, plank: number, base: string, line: string, vertical = false) {
  fillRect(ctx, x, y, w, h, base);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (vertical) {
    for (let px = x; px < x + w; px += plank) {
      ctx.moveTo(px + 0.5, y);
      ctx.lineTo(px + 0.5, y + h);
    }
  } else {
    for (let py = y; py < y + h; py += plank) {
      ctx.moveTo(x, py + 0.5);
      ctx.lineTo(x + w, py + 0.5);
    }
  }
  ctx.stroke();
}

/** Lyskæde, der hænger i en bue og blinker. */
export function lights(ctx: Ctx, x0: number, y0: number, x1: number, sag: number, n: number, t: number, seed = 0) {
  ctx.strokeStyle = 'rgba(20,30,20,0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0);
  ctx.stroke();
  const colors = ['#ff4d5e', '#ffd36b', '#5fe39b', '#7fb2ff', '#ff9a3d'];
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const x = x0 + (x1 - x0) * f;
    const y = y0 + sag * 4 * f * (1 - f) + 2;
    const on = Math.sin(t * 2.2 + i * 1.7 + seed) > -0.4;
    const c = colors[(i + seed) % colors.length]!;
    ctx.fillStyle = on ? c : 'rgba(80,80,80,0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y, 1.6, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (on) glow(ctx, x, y, 7, c, 0.35);
  }
}

/** Sne, der falder (deterministisk ud fra tiden). */
export function snow(ctx: Ctx, t: number, count: number, speed = 18, seed = 1, wind = 6, alpha = 0.85) {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < count; i++) {
    const r0 = hash01(i * 3.1 + seed);
    const r1 = hash01(i * 7.7 + seed);
    const size = 0.6 + hash01(i * 1.3 + seed) * 1.4;
    const v = speed * (0.6 + size * 0.4);
    const y = ((r1 * H + t * v) % (H + 10)) - 5;
    const x = ((r0 * (W + 40) + t * wind + Math.sin(t * 0.9 + i) * 4) % (W + 40)) - 20;
    ctx.globalAlpha = alpha * (0.5 + size * 0.3);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export interface NisseOpts {
  facing?: 1 | -1;
  walk?: number; // gang-fase (radianer), undefined = står stille
  hat?: string;
  coat?: string;
  carry?: 'box' | 'list' | 'sack' | null;
  boxColor?: string;
  armUp?: number; // 0-1, hammer/vinke
  blink?: boolean;
}

/** Nisse med fødderne i (x, y). s = skala (1 ≈ 30 px høj). */
export function nisse(ctx: Ctx, x: number, y: number, s: number, o: NisseOpts = {}) {
  const f = o.facing ?? 1;
  const hat = o.hat ?? '#d42a45';
  const coat = o.coat ?? '#1d7a55';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * f, s);
  const step = o.walk !== undefined ? Math.sin(o.walk) : 0;
  const bob = o.walk !== undefined ? Math.abs(Math.cos(o.walk)) * 1.2 : 0;
  ctx.translate(0, -bob);
  // ben
  ctx.fillStyle = '#3a2a1f';
  ctx.fillRect(-4 + step * 2.5, -7, 3, 7);
  ctx.fillRect(1 - step * 2.5, -7, 3, 7);
  ctx.fillStyle = '#1b1410';
  ctx.fillRect(-5 + step * 2.5, -1.5, 5, 2);
  ctx.fillRect(0.5 - step * 2.5, -1.5, 5, 2);
  // krop
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-6, -7);
  ctx.lineTo(6, -7);
  ctx.lineTo(4.5, -18);
  ctx.lineTo(-4.5, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2b1a12';
  ctx.fillRect(-5.6, -10, 11.2, 1.6);
  ctx.fillStyle = '#e3b04b';
  ctx.fillRect(-1, -10.2, 2, 2);
  // arme
  ctx.strokeStyle = coat;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const up = o.armUp ?? 0;
  if (o.carry === 'box' || o.carry === 'list') {
    ctx.moveTo(-3.5, -16);
    ctx.lineTo(4, -12.5);
    ctx.moveTo(3.5, -16);
    ctx.lineTo(7, -12.5);
  } else {
    ctx.moveTo(-4, -16);
    ctx.lineTo(-6 - step * 1.5, -10);
    ctx.moveTo(4, -16);
    ctx.lineTo(6 + up * 2, -10 - up * 9);
  }
  ctx.stroke();
  // hoved
  ctx.fillStyle = '#f3c6a5';
  ctx.beginPath();
  ctx.arc(0, -21.5, 4.2, 0, Math.PI * 2);
  ctx.fill();
  // skæg
  ctx.fillStyle = '#f7f2e8';
  ctx.beginPath();
  ctx.arc(0.5, -19.8, 3.6, 0.1, Math.PI - 0.1);
  ctx.fill();
  ctx.fillStyle = '#e48d84';
  ctx.beginPath();
  ctx.arc(2.6, -21.2, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b1a12';
  if (!o.blink) ctx.fillRect(1.6, -23.2, 1, 1.2);
  // hue
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.moveTo(-4.8, -23.5);
  ctx.quadraticCurveTo(-2, -33, -9 - step, -30);
  ctx.lineTo(4.8, -23.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(-5, -24.4, 10, 2);
  ctx.beginPath();
  ctx.arc(-9 - step, -30, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // det bårne
  if (o.carry === 'box') {
    gift(ctx, 3, -18, 9, 8, o.boxColor ?? '#e3b04b');
  } else if (o.carry === 'list') {
    ctx.fillStyle = '#f2ead6';
    ctx.fillRect(4, -18, 6, 9);
    ctx.fillStyle = '#9a8a6a';
    for (let i = 0; i < 4; i++) ctx.fillRect(5, -16.5 + i * 2, 4, 0.6);
  } else if (o.carry === 'sack') {
    ctx.fillStyle = '#7a5532';
    ctx.beginPath();
    ctx.ellipse(-6, -17, 5, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function gift(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, ribbon = '#f7f2e8') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x + w * 0.6, y, w * 0.4, h);
  ctx.fillStyle = ribbon;
  ctx.fillRect(x + w / 2 - 0.8, y, 1.6, h);
  ctx.fillRect(x, y + h / 2 - 0.8, w, 1.6);
  ctx.beginPath();
  ctx.ellipse(x + w / 2 - 2, y - 1, 2, 1.3, -0.5, 0, Math.PI * 2);
  ctx.ellipse(x + w / 2 + 2, y - 1, 2, 1.3, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

export interface DeerOpts {
  facing?: 1 | -1;
  walk?: number;
  headDown?: number; // 0-1 (spiser)
  lying?: boolean;
  nose?: boolean; // lysende næse
  t?: number;
  color?: string;
}

/** Rensdyr med fødderne i (x, y). s = skala (1 ≈ 40 px lang). */
export function reindeer(ctx: Ctx, x: number, y: number, s: number, o: DeerOpts = {}) {
  const f = o.facing ?? 1;
  const body = o.color ?? '#8a5a3b';
  const dark = '#5d3a24';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * f, s);
  const lie = o.lying ? 9 : 0;
  const w = o.walk !== undefined ? o.walk : 0;
  // ben
  if (!o.lying) {
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    const legs = [-11, -7, 8, 12];
    legs.forEach((lx, i) => {
      const sw = o.walk !== undefined ? Math.sin(w + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * 3 : 0;
      ctx.beginPath();
      ctx.moveTo(lx, -13);
      ctx.lineTo(lx + sw, -1);
      ctx.stroke();
    });
  }
  // krop
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, -17 + lie, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#efe3cf';
  ctx.beginPath();
  ctx.ellipse(-15, -19 + lie, 2.5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // hals + hoved
  const hd = o.headDown ?? 0;
  const hx = 15 + hd * 3;
  const hy = -28 + lie + hd * 18;
  ctx.strokeStyle = body;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(10, -20 + lie);
  ctx.lineTo(hx - 2, hy + 3);
  ctx.stroke();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(hx + 2, hy, 6, 3.6, 0.35 + hd * 0.6, 0, Math.PI * 2);
  ctx.fill();
  // gevir
  ctx.strokeStyle = '#d9b98a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(hx - 1, hy - 3);
  ctx.lineTo(hx - 4, hy - 11);
  ctx.lineTo(hx - 8, hy - 14);
  ctx.moveTo(hx - 4, hy - 11);
  ctx.lineTo(hx - 2, hy - 15);
  ctx.moveTo(hx + 1, hy - 3);
  ctx.lineTo(hx + 2, hy - 10);
  ctx.lineTo(hx + 6, hy - 13);
  ctx.stroke();
  // øre, øje, næse
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(hx - 3, hy - 2, 2.2, 1, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1410';
  ctx.fillRect(hx + 2, hy - 1.5, 1.2, 1.2);
  const nx = hx + 7.5 + hd * 0.5;
  const ny = hy + 1.5 + hd * 1.5;
  ctx.fillStyle = o.nose ? '#ff4d4d' : '#2b1a12';
  ctx.beginPath();
  ctx.arc(nx, ny, o.nose ? 1.8 : 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (o.nose) {
    const wx = x + f * nx * s;
    glow(ctx, wx, y + ny * s, 10 * s, '#ff5a5a', 0.45 + Math.sin((o.t ?? 0) * 3) * 0.15);
  }
}

/** Julemanden set fra siden ved et skrivebord. */
export function santa(ctx: Ctx, x: number, y: number, s: number, t: number, reading = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // krop
  ctx.fillStyle = '#c8273f';
  ctx.beginPath();
  ctx.ellipse(0, -22, 17, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(-2, -42, 4, 40);
  ctx.fillStyle = '#1b1410';
  ctx.fillRect(-17, -18, 34, 5);
  ctx.fillStyle = '#e3b04b';
  ctx.fillRect(-3, -19, 6, 7);
  // hoved
  const nod = Math.sin(t * 0.6) * 1.2;
  ctx.translate(0, nod);
  ctx.fillStyle = '#f3c6a5';
  ctx.beginPath();
  ctx.arc(2, -50, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f2e8';
  ctx.beginPath();
  ctx.moveTo(-6, -50);
  ctx.quadraticCurveTo(2, -26, 11, -50);
  ctx.quadraticCurveTo(2, -42, -6, -50);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, -46, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e48d84';
  ctx.beginPath();
  ctx.arc(6, -50, 1.8, 0, Math.PI * 2);
  ctx.fill();
  // briller
  ctx.strokeStyle = '#e3b04b';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(1, -52, 2.2, 0, Math.PI * 2);
  ctx.arc(6.5, -52, 2.2, 0, Math.PI * 2);
  ctx.stroke();
  // hue
  ctx.fillStyle = '#c8273f';
  ctx.beginPath();
  ctx.moveTo(-7, -54);
  ctx.quadraticCurveTo(0, -70, -14, -64);
  ctx.lineTo(10, -55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f7f2e8';
  ctx.fillRect(-7, -57, 17, 4);
  ctx.beginPath();
  ctx.arc(-14, -64, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // arme + brev
  if (reading) {
    const lift = Math.sin(t * 0.8) * 2;
    ctx.fillStyle = '#f2ead6';
    ctx.save();
    ctx.translate(x + 18 * s, y - 34 * s + lift);
    ctx.rotate(-0.2);
    ctx.fillRect(0, 0, 14 * s, 18 * s);
    ctx.fillStyle = '#8a7a5a';
    for (let i = 0; i < 6; i++) ctx.fillRect(2 * s, (3 + i * 2.5) * s, 10 * s, 0.6 * s);
    ctx.restore();
  }
}

/** Damp der stiger op (kakao, skorsten). */
export function steam(ctx: Ctx, x: number, y: number, t: number, n = 3, alpha = 0.35) {
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 1.2;
  for (let i = 0; i < n; i++) {
    const ph = t * 1.5 + i * 2;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const yy = y - k * 2;
      const xx = x + i * 3 - 3 + Math.sin(ph + k * 0.6) * 1.5;
      if (k === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
}

/** Lampe med lyskegle. */
export function lamp(ctx: Ctx, x: number, y: number, len: number, swing: number, color = '#ffd98a') {
  const ex = x + Math.sin(swing) * len * 0.15;
  const ey = y + len;
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.moveTo(ex - 7, ey + 5);
  ctx.lineTo(ex + 7, ey + 5);
  ctx.lineTo(ex + 3, ey);
  ctx.lineTo(ex - 3, ey);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(ex, ey, ex, ey + 120);
  g.addColorStop(0, 'rgba(255,217,138,0.28)');
  g.addColorStop(1, 'rgba(255,217,138,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(ex - 6, ey + 5);
  ctx.lineTo(ex + 6, ey + 5);
  ctx.lineTo(ex + 50, ey + 130);
  ctx.lineTo(ex - 50, ey + 130);
  ctx.fill();
  ctx.restore();
  glow(ctx, ex, ey + 5, 14, color, 0.6);
}
