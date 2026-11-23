/**
 * Visuel røgtest: tager screenshots af siderne i desktop- og mobilstørrelse
 * og rapporterer konsolfejl.
 *   node scripts/screenshot.mjs [baseUrl] [outDir] [sti ...]
 * Eksempel med tidsmaskine:  node scripts/screenshot.mjs http://127.0.0.1:3200 shots "/?tid=2026-12-24T19:20"
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:3200';
const out = process.argv[3] ?? 'shots';
const paths = process.argv.slice(4);
const targets = paths.length ? paths : ['/', '/overvaagning', '/julekalender', '/rensdyr', '/missioner'];
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const sizes = [
  { name: 'desktop', width: 1600, height: 1000, mobile: false },
  { name: 'mobil', width: 390, height: 844, mobile: true },
];
let errors = 0;
for (const size of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: 1,
    isMobile: size.mobile,
    hasTouch: size.mobile,
    locale: 'da-DK',
    timezoneId: 'Europe/Copenhagen',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') {
      errors++;
      console.log(`[${size.name}] konsolfejl: ${m.text()}`);
    }
  });
  page.on('pageerror', (e) => {
    errors++;
    console.log(`[${size.name}] sidefejl: ${e.message}`);
  });
  for (const p of targets) {
    await page.goto(base + p, { waitUntil: 'networkidle' }).catch(() => undefined);
    await page.waitForTimeout(p.startsWith('/?') || p === '/' ? 6000 : 2500);
    const file = path.join(out, `${size.name}${p.replace(/[^a-z0-9]+/gi, '_') || '_forside'}.png`);
    await page.screenshot({ path: file, fullPage: !!process.env.FULL, timeout: 120000 });
    console.log('gemt', file);
  }
  await ctx.close();
}
await browser.close();
console.log(errors ? `${errors} fejl fundet` : 'Ingen konsolfejl');
