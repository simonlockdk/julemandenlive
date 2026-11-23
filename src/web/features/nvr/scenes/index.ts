/**
 * De otte animerede kamerascener fra Nordpolen. Hver scene er en ren
 * funktion af tiden (sekunder), så billedet er det samme for alle.
 */
import {
  H,
  W,
  fillRect,
  gift,
  glow,
  hash01,
  lamp,
  lights,
  nisse,
  planks,
  reindeer,
  roundRect,
  santa,
  snow,
  steam,
  vgrad,
  type Ctx,
} from './draw';

export type SceneId = 'workshop' | 'stable' | 'garage' | 'packing' | 'yard' | 'office' | 'training' | 'secret';
export type SceneFn = (ctx: Ctx, t: number) => void;

const GIFT_COLORS = ['#d42a45', '#e3b04b', '#23905f', '#7fb2ff', '#c15bd6', '#f7f2e8'];

/* CAM01 – Nissernes hovedværksted */
const workshop: SceneFn = (ctx, t) => {
  planks(ctx, 0, 0, W, 130, 9, '#4a2f1d', '#3a2414', true);
  fillRect(ctx, 0, 0, W, 130, vgrad(ctx, 0, 130, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]));
  // hylder med legetøj
  for (let r = 0; r < 2; r++) {
    const y = 34 + r * 38;
    fillRect(ctx, 20, y, 140, 4, '#6b4a2b');
    for (let i = 0; i < 9; i++) {
      const x = 26 + i * 15;
      const c = GIFT_COLORS[(i + r * 3) % GIFT_COLORS.length]!;
      if ((i + r) % 3 === 0) {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x + 4, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if ((i + r) % 3 === 1) {
        fillRect(ctx, x, y - 12, 8, 12, c);
        fillRect(ctx, x + 2, y - 15, 4, 3, '#f3c6a5');
      } else {
        fillRect(ctx, x, y - 7, 10, 7, c);
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(x + 2, y, 2, 0, Math.PI * 2);
        ctx.arc(x + 8, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // vindue med sne
  roundRect(ctx, 250, 18, 90, 62, 4, '#0b1836');
  ctx.save();
  ctx.beginPath();
  ctx.rect(250, 18, 90, 62);
  ctx.clip();
  snow(ctx, t, 60, 14, 4, 4, 0.8);
  ctx.restore();
  ctx.strokeStyle = '#6b4a2b';
  ctx.lineWidth = 4;
  ctx.strokeRect(250, 18, 90, 62);
  ctx.beginPath();
  ctx.moveTo(295, 18);
  ctx.lineTo(295, 80);
  ctx.moveTo(250, 49);
  ctx.lineTo(340, 49);
  ctx.stroke();
  lights(ctx, 0, 6, W, 12, 18, t, 1);
  // gulv
  fillRect(ctx, 0, 130, W, 86, vgrad(ctx, 130, 216, [[0, '#5a3b25'], [1, '#2b1a10']]));
  // samlebånd
  fillRect(ctx, 0, 150, W, 14, '#2a2a30');
  fillRect(ctx, 0, 150, W, 3, '#4a4a55');
  for (let i = 0; i < 26; i++) {
    const x = ((i * 16 + t * 22) % (W + 16)) - 16;
    fillRect(ctx, x, 154, 1.5, 8, '#15151a');
  }
  for (let i = 0; i < 7; i++) {
    const x = ((i * 62 + t * 22) % (W + 60)) - 40;
    gift(ctx, x, 136, 14 + (i % 3) * 3, 14, GIFT_COLORS[i % GIFT_COLORS.length]!);
  }
  fillRect(ctx, 30, 164, 6, 30, '#1c1c22');
  fillRect(ctx, 340, 164, 6, 30, '#1c1c22');
  // arbejdsbord og nisser
  fillRect(ctx, 168, 112, 70, 5, '#7a5532');
  fillRect(ctx, 172, 117, 4, 26, '#5a3b25');
  fillRect(ctx, 230, 117, 4, 26, '#5a3b25');
  nisse(ctx, 185, 140, 1.15, { armUp: Math.max(0, Math.sin(t * 7)), facing: 1 });
  nisse(ctx, 222, 140, 1.1, { facing: -1, hat: '#b3122e', coat: '#0f4d36', carry: 'list', blink: Math.sin(t * 1.3) > 0.97 });
  // nisse der går med en gave
  const walkX = ((t * 18) % (W + 80)) - 40;
  nisse(ctx, walkX, 205, 1.4, { walk: t * 7, carry: 'box', boxColor: '#7fb2ff', facing: 1 });
  lamp(ctx, 205, 0, 62, Math.sin(t * 0.7) * 0.4);
};

/* CAM02 – Rensdyrstalden */
const stable: SceneFn = (ctx, t) => {
  planks(ctx, 0, 0, W, 140, 11, '#3d2818', '#2a1b10', true);
  fillRect(ctx, 0, 0, W, 140, vgrad(ctx, 0, 140, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0.05)']]));
  // bjælker
  fillRect(ctx, 0, 22, W, 8, '#24170d');
  for (const x of [0, 128, 256, 380]) fillRect(ctx, x, 22, 6, 120, '#24170d');
  // navneskilte
  ['RUDOLF', 'LYNFOD', 'DANSER'].forEach((n, i) => {
    roundRect(ctx, 40 + i * 128, 38, 48, 12, 2, '#6b4a2b');
    ctx.fillStyle = '#f2c96b';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(n, 64 + i * 128, 47);
  });
  // gulv og hø
  fillRect(ctx, 0, 140, W, 76, vgrad(ctx, 140, 216, [[0, '#6b5230'], [1, '#3a2a14']]));
  ctx.strokeStyle = 'rgba(214,180,100,0.5)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 120; i++) {
    const x = hash01(i) * W;
    const y = 145 + hash01(i + 9) * 70;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 * (hash01(i + 3) - 0.5), y - 3);
    ctx.stroke();
  }
  // høstak og trug
  ctx.fillStyle = '#c9a256';
  ctx.beginPath();
  ctx.ellipse(70, 150, 40, 18, 0, Math.PI, 0);
  ctx.fill();
  fillRect(ctx, 150, 140, 60, 12, '#5a3b25');
  fillRect(ctx, 152, 136, 56, 5, '#d98b2b');
  // rensdyr: ét spiser, ét ligger, ét kigger rundt
  reindeer(ctx, 170, 168, 1.5, { headDown: 0.5 + Math.sin(t * 2.4) * 0.5, facing: 1 });
  reindeer(ctx, 70, 180, 1.4, { lying: true, facing: -1, headDown: 0.15 + Math.sin(t * 0.5) * 0.1 });
  const look = Math.sin(t * 0.35) > 0 ? 1 : -1;
  reindeer(ctx, 300, 176, 1.5, { facing: look as 1 | -1, nose: true, t });
  // nisse med børste kommer forbi
  const nx = 380 - ((t * 10) % 460);
  nisse(ctx, nx, 210, 1.3, { walk: t * 6, facing: -1, hat: '#c8273f' });
  lamp(ctx, 250, 0, 34, Math.sin(t * 0.5) * 0.3);
};

/* CAM03 – Kanegaragen */
const garage: SceneFn = (ctx, t) => {
  fillRect(ctx, 0, 0, W, 216, vgrad(ctx, 0, 216, [[0, '#1a2233'], [0.6, '#232c3f'], [1, '#14181f']]));
  // værktøjsvæg
  roundRect(ctx, 14, 30, 110, 70, 3, '#2c3447');
  ctx.strokeStyle = '#8a95ad';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const x = 26 + i * 17;
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, 70 + (i % 2) * 10);
    ctx.stroke();
  }
  // stor port med vinduer
  roundRect(ctx, 250, 22, 120, 110, 4, '#2a3245');
  for (let i = 0; i < 3; i++) roundRect(ctx, 260 + i * 37, 34, 28, 16, 2, '#0b1836');
  // gulv
  fillRect(ctx, 0, 150, W, 66, vgrad(ctx, 150, 216, [[0, '#3a414f'], [1, '#1c2028']]));
  ctx.strokeStyle = 'rgba(242,201,107,0.6)';
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.lineTo(W, 200);
  ctx.stroke();
  ctx.setLineDash([]);
  // kanen
  const cx = 190;
  const cy = 168;
  ctx.fillStyle = '#5a3b25';
  ctx.fillRect(cx - 60, cy + 4, 8, 10);
  ctx.fillRect(cx + 50, cy + 4, 8, 10);
  ctx.strokeStyle = '#f2c96b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 80, cy + 2);
  ctx.lineTo(cx + 60, cy + 2);
  ctx.quadraticCurveTo(cx + 80, cy, cx + 78, cy - 16);
  ctx.stroke();
  const sg = ctx.createLinearGradient(0, cy - 50, 0, cy);
  sg.addColorStop(0, '#ec5b6f');
  sg.addColorStop(1, '#8e0f25');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(cx - 78, cy - 2);
  ctx.quadraticCurveTo(cx - 88, cy - 46, cx - 50, cy - 50);
  ctx.lineTo(cx + 20, cy - 50);
  ctx.quadraticCurveTo(cx + 46, cy - 48, cx + 50, cy - 20);
  ctx.lineTo(cx + 52, cy - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f2c96b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy - 22);
  ctx.quadraticCurveTo(cx - 10, cy - 30, cx + 46, cy - 22);
  ctx.stroke();
  // glimt hvor der poleres
  const px = cx - 40 + ((Math.sin(t * 0.4) + 1) / 2) * 80;
  glow(ctx, px, cy - 30 + Math.sin(t * 6) * 3, 16, '#fff6d8', 0.5 + Math.sin(t * 9) * 0.2);
  // nisse der polerer
  nisse(ctx, px - 6, cy + 30, 1.3, { armUp: 0.5 + Math.sin(t * 9) * 0.5, facing: 1, coat: '#23905f' });
  // nisse med oliekande
  nisse(ctx, 320, 205, 1.2, { facing: -1, hat: '#b3122e', blink: Math.sin(t) > 0.96 });
  fillRect(ctx, 304, 188, 6, 6, '#8a95ad');
  lamp(ctx, 190, 0, 30, Math.sin(t * 0.8) * 0.5, '#e8f0ff');
};

/* CAM04 – Gavepakkeriet */
const packing: SceneFn = (ctx, t) => {
  fillRect(ctx, 0, 0, W, 216, vgrad(ctx, 0, 216, [[0, '#2a1d2e'], [1, '#160f18']]));
  // reoler med sække
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 80;
    fillRect(ctx, x, 20, 60, 3, '#6b4a2b');
    fillRect(ctx, x, 55, 60, 3, '#6b4a2b');
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = '#7a5532';
      ctx.beginPath();
      ctx.ellipse(x + 12 + k * 18, 46, 8, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // tæller
  roundRect(ctx, 150, 66, 84, 22, 3, '#0a0f0a');
  ctx.fillStyle = '#5fe39b';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`PAKKER ${String(Math.floor(t * 3.3) % 1000000).padStart(6, '0')}`, 192, 81);
  // diagonalt pakkebånd
  ctx.save();
  ctx.translate(0, 120);
  ctx.rotate(-0.08);
  fillRect(ctx, -10, 20, W + 20, 18, '#30303a');
  fillRect(ctx, -10, 20, W + 20, 3, '#55556a');
  for (let i = 0; i < 9; i++) {
    const x = ((i * 50 + t * 30) % (W + 60)) - 40;
    gift(ctx, x, 4, 12 + (i % 2) * 6, 16 - (i % 3) * 2, GIFT_COLORS[(i + 2) % GIFT_COLORS.length]!);
  }
  ctx.restore();
  // scannerbue
  fillRect(ctx, 180, 92, 6, 60, '#8a95ad');
  fillRect(ctx, 230, 88, 6, 60, '#8a95ad');
  fillRect(ctx, 180, 88, 56, 8, '#8a95ad');
  const beam = (Math.sin(t * 5) + 1) / 2;
  ctx.fillStyle = `rgba(255,60,60,${0.25 + beam * 0.4})`;
  ctx.fillRect(186, 96, 44, 2 + beam * 40);
  glow(ctx, 208, 92, 10, '#ff4d4d', 0.6);
  // gulv + nisser der sorterer
  fillRect(ctx, 0, 170, W, 46, '#1b1420');
  nisse(ctx, 120, 200, 1.3, { carry: 'box', boxColor: GIFT_COLORS[Math.floor(t / 3) % 6], facing: 1, walk: Math.sin(t * 0.8) > 0 ? t * 6 : undefined });
  nisse(ctx, 270, 200, 1.3, { facing: -1, armUp: Math.max(0, Math.sin(t * 3)), coat: '#8e0f25', hat: '#23905f' });
  nisse(ctx, 330, 205, 1.1, { facing: -1, carry: 'list' });
  lights(ctx, 0, 4, W, 8, 16, t, 3);
};

/* CAM05 – Nordpolens gårdsplads (udendørs) */
const yard: SceneFn = (ctx, t) => {
  // let rystende mastkamera i vinden
  const shake = Math.sin(t * 1.7) * 0.6;
  ctx.save();
  ctx.translate(shake, Math.cos(t * 1.3) * 0.4);
  fillRect(ctx, -2, -2, W + 4, 120, vgrad(ctx, 0, 120, [[0, '#050b1a'], [1, '#18305f']]));
  // nordlys
  ctx.save();
  ctx.globalAlpha = 0.25 + Math.sin(t * 0.2) * 0.1;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = vgrad(ctx, 10, 70, [[0, 'rgba(76,194,138,0)'], [0.5, 'rgba(76,194,138,0.8)'], [1, 'rgba(76,194,138,0)']]);
  ctx.beginPath();
  ctx.moveTo(0, 50);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, 40 + Math.sin(x * 0.02 + t * 0.4) * 14);
  ctx.lineTo(W, 0);
  ctx.lineTo(0, 0);
  ctx.fill();
  ctx.restore();
  // huse
  const houses = [
    { x: 10, w: 80, h: 52, c: '#8e0f25' },
    { x: 110, w: 110, h: 70, c: '#6b4a2b' },
    { x: 250, w: 90, h: 56, c: '#0f4d36' },
  ];
  for (const hz of houses) {
    const y = 128 - hz.h;
    fillRect(ctx, hz.x, y, hz.w, hz.h, hz.c);
    ctx.fillStyle = '#e8eef8';
    ctx.beginPath();
    ctx.moveTo(hz.x - 6, y + 2);
    ctx.lineTo(hz.x + hz.w / 2, y - 22);
    ctx.lineTo(hz.x + hz.w + 6, y + 2);
    ctx.fill();
    for (let i = 0; i < Math.floor(hz.w / 30); i++) {
      const wx = hz.x + 10 + i * 30;
      const on = Math.sin(t * 0.3 + wx) > -0.7;
      fillRect(ctx, wx, y + 16, 12, 12, on ? '#ffd98a' : '#2a2030');
      if (on) glow(ctx, wx + 6, y + 22, 16, '#ffd98a', 0.4);
    }
  }
  steam(ctx, 190, 30, t, 3, 0.25);
  lights(ctx, 10, 72, 220, 10, 14, t, 2);
  lights(ctx, 220, 74, 380, 8, 10, t, 4);
  // sne på jorden
  fillRect(ctx, -2, 126, W + 4, 92, vgrad(ctx, 126, 216, [[0, '#cfd9ea'], [1, '#8fa0c2']]));
  // juletræ
  ctx.fillStyle = '#0f4d36';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(352 - 22 + i * 4, 150 - i * 16);
    ctx.lineTo(352, 120 - i * 16 - 10);
    ctx.lineTo(352 + 22 - i * 4, 150 - i * 16);
    ctx.fill();
  }
  fillRect(ctx, 348, 150, 8, 8, '#5a3b25');
  for (let i = 0; i < 10; i++) {
    const on = Math.sin(t * 3 + i) > 0;
    ctx.fillStyle = on ? GIFT_COLORS[i % 5]! : '#333';
    ctx.beginPath();
    ctx.arc(340 + hash01(i) * 24, 100 + hash01(i + 4) * 46, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // snemand
  ctx.fillStyle = '#f2f5fa';
  ctx.beginPath();
  ctx.arc(60, 170, 14, 0, Math.PI * 2);
  ctx.arc(60, 148, 10, 0, Math.PI * 2);
  ctx.fill();
  fillRect(ctx, 53, 132, 14, 4, '#1b1410');
  fillRect(ctx, 56, 124, 8, 9, '#1b1410');
  ctx.fillStyle = '#ff8a3d';
  ctx.beginPath();
  ctx.moveTo(60, 148);
  ctx.lineTo(70, 150);
  ctx.lineTo(60, 151);
  ctx.fill();
  // nisser med pakker og kælk
  const a = ((t * 16) % (W + 120)) - 60;
  nisse(ctx, a, 195, 1.5, { walk: t * 7, carry: 'sack', facing: 1 });
  const b = W + 60 - ((t * 11 + 200) % (W + 120));
  nisse(ctx, b, 182, 1.25, { walk: t * 6, carry: 'box', boxColor: '#d42a45', facing: -1, coat: '#8e0f25' });
  fillRect(ctx, b + 8, 178, 22, 4, '#7a5532');
  gift(ctx, b + 12, 170, 8, 8, '#23905f');
  ctx.restore();
  snow(ctx, t, 90, 26, 9, 14);
};

/* CAM06 – Julemandens kontor */
const office: SceneFn = (ctx, t) => {
  fillRect(ctx, 0, 0, W, 216, vgrad(ctx, 0, 216, [[0, '#3b1a1f'], [1, '#1e0d10']]));
  // tapet-striber
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let x = 0; x < W; x += 16) ctx.fillRect(x, 0, 8, 150);
  // verdenskort med blinkende nåle
  roundRect(ctx, 200, 24, 160, 86, 3, '#c9b48a');
  ctx.fillStyle = '#8a9a6a';
  const blobs = [
    [230, 50, 22, 14],
    [258, 80, 10, 16],
    [295, 45, 20, 12],
    [305, 70, 14, 18],
    [335, 55, 16, 12],
    [340, 88, 10, 6],
  ];
  for (const [x, y, rx, ry] of blobs) {
    ctx.beginPath();
    ctx.ellipse(x!, y!, rx!, ry!, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 14; i++) {
    const on = Math.sin(t * 2 + i * 1.3) > 0.3;
    const x = 210 + hash01(i + 40) * 140;
    const y = 34 + hash01(i + 70) * 66;
    ctx.fillStyle = on ? '#ff4d5e' : '#7a1a24';
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    if (on) glow(ctx, x, y, 6, '#ff4d5e', 0.4);
  }
  ctx.strokeStyle = '#6b4a2b';
  ctx.lineWidth = 3;
  ctx.strokeRect(200, 24, 160, 86);
  // pejs
  fillRect(ctx, 20, 70, 90, 80, '#5a3b2f');
  fillRect(ctx, 14, 64, 102, 8, '#3a2418');
  fillRect(ctx, 36, 96, 58, 54, '#120806');
  for (let i = 0; i < 5; i++) {
    const fh = 18 + Math.sin(t * 8 + i * 2) * 6 + hash01(Math.floor(t * 10) + i) * 4;
    ctx.fillStyle = i % 2 ? '#ff9a3d' : '#ffd36b';
    ctx.beginPath();
    ctx.moveTo(42 + i * 10, 150);
    ctx.quadraticCurveTo(46 + i * 10, 150 - fh, 50 + i * 10, 150);
    ctx.fill();
  }
  glow(ctx, 65, 135, 60, '#ff9a3d', 0.35 + Math.sin(t * 7) * 0.05);
  // strømper
  for (let i = 0; i < 3; i++) {
    fillRect(ctx, 32 + i * 28, 72, 9, 14, i === 1 ? '#23905f' : '#d42a45');
    fillRect(ctx, 32 + i * 28, 72, 9, 3, '#f7f2e8');
  }
  // skrivebord og julemanden
  fillRect(ctx, 150, 150, 220, 10, '#6b4a2b');
  fillRect(ctx, 150, 160, 220, 56, '#4a2f1d');
  santa(ctx, 230, 150, 1.25, t);
  // stak af ønskesedler
  for (let i = 0; i < 6; i++) fillRect(ctx, 300 + (i % 2), 142 - i * 2, 26, 2, i % 2 ? '#f2ead6' : '#e8dcc0');
  // kakaokop med damp
  roundRect(ctx, 340, 138, 12, 12, 2, '#f7f2e8');
  fillRect(ctx, 341, 139, 10, 3, '#6b3a1f');
  steam(ctx, 346, 136, t);
  glow(ctx, 270, 120, 70, '#ffd98a', 0.18);
};

/* CAM07 – Rensdyrenes træningsbane */
const training: SceneFn = (ctx, t) => {
  fillRect(ctx, 0, 0, W, 90, vgrad(ctx, 0, 90, [[0, '#0a1530'], [1, '#2b4a7a']]));
  // fjelde
  ctx.fillStyle = '#c9d6ea';
  ctx.beginPath();
  ctx.moveTo(0, 90);
  ctx.lineTo(60, 40);
  ctx.lineTo(110, 78);
  ctx.lineTo(170, 30);
  ctx.lineTo(240, 82);
  ctx.lineTo(300, 46);
  ctx.lineTo(384, 88);
  ctx.lineTo(384, 92);
  ctx.lineTo(0, 92);
  ctx.fill();
  fillRect(ctx, 0, 88, W, 128, vgrad(ctx, 88, 216, [[0, '#e3ebf6'], [1, '#a9b8d2']]));
  // bane-markeringer
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 45;
    fillRect(ctx, x, 120, 2, 16, i % 2 ? '#d42a45' : '#f7f2e8');
    fillRect(ctx, x, 160, 2, 18, i % 2 ? '#f7f2e8' : '#d42a45');
  }
  // forhindring
  fillRect(ctx, 250, 146, 3, 18, '#6b4a2b');
  fillRect(ctx, 290, 146, 3, 18, '#6b4a2b');
  fillRect(ctx, 248, 146, 48, 3, '#f2c96b');
  // rensdyrspand med kane
  const period = 14;
  const ph = (t % period) / period;
  const x = W + 80 - ph * (W + 200);
  const jump = x > 225 && x < 300 ? Math.sin(((300 - x) / 75) * Math.PI) * 22 : 0;
  const y = 168 - jump;
  reindeer(ctx, x, y, 1.2, { walk: t * 12, facing: -1, t, nose: true });
  reindeer(ctx, x + 40, y + 2, 1.2, { walk: t * 12 + 1, facing: -1 });
  ctx.strokeStyle = '#e3b04b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 52, y - 18);
  ctx.lineTo(x + 86, y - 10);
  ctx.stroke();
  fillRect(ctx, x + 84, y - 18, 30, 14, '#b3122e');
  fillRect(ctx, x + 80, y - 3, 38, 2, '#f2c96b');
  // tilskuer-nisser med flag
  nisse(ctx, 40, 205, 1.2, { armUp: Math.max(0, Math.sin(t * 5)), facing: 1 });
  nisse(ctx, 70, 207, 1.1, { armUp: Math.max(0, Math.sin(t * 5 + 1)), facing: 1, hat: '#23905f', coat: '#8e0f25' });
  fillRect(ctx, 76, 172, 1, 14, '#f7f2e8');
  fillRect(ctx, 77, 172, 8, 5, '#d42a45');
  // stopur
  roundRect(ctx, 300, 186, 70, 20, 3, 'rgba(5,11,26,0.75)');
  ctx.fillStyle = '#f2c96b';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${(ph * period).toFixed(1).replace('.', ',')} s`, 335, 200);
  snow(ctx, t, 30, 14, 12, 8, 0.6);
};

/* CAM08 – Hemmeligt nissekamera */
const secret: SceneFn = (ctx, t) => {
  fillRect(ctx, 0, 0, W, 216, vgrad(ctx, 0, 216, [[0, '#120e1a'], [1, '#05040a']]));
  // hylder med glas og kasser
  for (let r = 0; r < 3; r++) {
    fillRect(ctx, 30, 40 + r * 44, 140, 3, '#3a2a1f');
    for (let i = 0; i < 5; i++) {
      const x = 36 + i * 27;
      ctx.fillStyle = `rgba(150,200,255,0.18)`;
      ctx.fillRect(x, 22 + r * 44, 14, 18);
      ctx.fillStyle = GIFT_COLORS[(i + r) % 6]!;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + 2, 30 + r * 44, 10, 10);
      ctx.globalAlpha = 1;
    }
  }
  // kagedåse
  roundRect(ctx, 210, 120, 40, 34, 6, '#23905f');
  fillRect(ctx, 208, 116, 44, 7, '#f2c96b');
  // mystisk kasse der vrikker
  const wig = Math.sin(t * 14) * (Math.sin(t * 0.7) > 0.6 ? 2.5 : 0);
  ctx.save();
  ctx.translate(300, 176);
  ctx.rotate(wig * 0.03);
  fillRect(ctx, -32, -40, 64, 40, '#7a5532');
  fillRect(ctx, -32, -40, 64, 6, '#5a3b25');
  ctx.fillStyle = '#2b1a12';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HEMMELIGT', 0, -16);
  ctx.restore();
  // nisse kigger op af kassen indimellem
  const peek = Math.max(0, Math.sin(t * 0.45)) ** 3;
  if (peek > 0.05) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(260, 100, 80, 36);
    ctx.clip();
    nisse(ctx, 300, 136 + (1 - peek) * 28 + 6, 1.3, { facing: Math.sin(t * 0.3) > 0 ? 1 : -1, blink: Math.sin(t * 2) > 0.9 });
    ctx.restore();
  }
  // øjne i mørket
  const eyes = Math.sin(t * 0.23 + 1) > 0.7;
  if (eyes) {
    const blink = Math.sin(t * 3) > 0.92;
    ctx.fillStyle = '#f2c96b';
    if (!blink) {
      ctx.beginPath();
      ctx.arc(80, 182, 2, 0, Math.PI * 2);
      ctx.arc(90, 182, 2, 0, Math.PI * 2);
      ctx.fill();
      glow(ctx, 85, 182, 12, '#f2c96b', 0.3);
    }
  }
  // svingende pære
  lamp(ctx, 190, 0, 38, Math.sin(t * 1.1) * 0.8, '#ffe0a0');
  // flyvende småkage indimellem
  const cookie = (t % 23) / 23;
  if (cookie < 0.25) {
    const cx = 220 + cookie * 400;
    const cy = 116 - Math.sin(cookie * 4 * Math.PI) * 40;
    ctx.fillStyle = '#c98b4a';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
};

export const SCENES: Record<SceneId, SceneFn> = {
  workshop,
  stable,
  garage,
  packing,
  yard,
  office,
  training,
  secret,
};

export { W as SCENE_W, H as SCENE_H };
