/**
 * End-to-end-test af de vigtigste brugerflows i en rigtig browser.
 *   ADMIN_USER=julemanden ADMIN_PASSWORD=… node scripts/e2e.mjs [baseUrl]
 * Kræver at serveren kører med TIME_MACHINE_FOR_ALL=true (udviklingstilstand)
 * for kalendertestene. Admin-delen springes over uden ADMIN_PASSWORD.
 */
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://127.0.0.1:3200';
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✔' : '✘'} ${name}${extra ? ` – ${extra}` : ''}`);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// Reduceret bevægelse: tester at siden virker uden animationer, og holder
// testen hurtig i headless-browsere uden GPU.
const ctx = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  locale: 'da-DK',
  timezoneId: 'Europe/Copenhagen',
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

try {
  /* ---------- forside ---------- */
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Flydata' }).waitFor({ timeout: 20000 });
  check('Forsiden viser flydata', true);
  check('Nedtællinger vises', await page.getByText('Julekalenderen åbner').isVisible());
  check('Adventskrans vises', await page.getByRole('img', { name: /Adventskrans med/ }).isVisible());
  await page.locator('.maplibregl-canvas').waitFor({ timeout: 60000 });
  check('Kortet er indlæst', true);

  /* ---------- skjult nisse ---------- */
  await page.getByRole('button', { name: /En skjult nisse/ }).first().click();
  await page.getByText(/Du fandt/).waitFor({ timeout: 5000 });
  check('Skjult nisse kan findes', (await page.locator('.nisse-counter').innerText()).startsWith('1/'));

  /* ---------- NVR ---------- */
  await page.goto(base + '/overvaagning', { waitUntil: 'domcontentloaded' });
  await page.locator('.cam').first().waitFor();
  check('NVR viser 8 kameraer', (await page.locator('.nvr-grid .cam').count()) === 8);
  await page.keyboard.press('6');
  await page.getByRole('heading', { name: 'Julemandens kontor' }).waitFor({ timeout: 5000 });
  check('Tastaturgenvej 6 åbner CAM06', page.url().includes('kamera=cam06'));
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  check('Pil højre skifter til CAM07', page.url().includes('kamera=cam07'));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Escape går tilbage til oversigten', !page.url().includes('kamera='));

  /* ---------- separat kameravindue ---------- */
  await page.goto(base + '/kamera/cam02', { waitUntil: 'domcontentloaded' });
  await page.locator('.cam-solo').waitFor();
  check('Kamera kan åbnes separat', true);

  /* ---------- julekalender (tidsmaskine) ---------- */
  await page.goto(base + '/julekalender?tid=2026-11-30T23:30', { waitUntil: 'domcontentloaded' });
  await page.locator('.door').first().waitFor();
  await page.waitForTimeout(800);
  const lockedNov = await page.locator('.door[data-locked="true"]').count();
  check('Alle låger er låst 30. november', lockedNov === 24, `${lockedNov} låst`);

  await page.goto(base + '/julekalender?tid=2026-12-05T08:00', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('.door[data-locked="false"]').length > 0, null, { timeout: 10000 });
  const unlocked = await page.locator('.door[data-locked="false"]').count();
  check('5. december: præcis 5 låger åbne', unlocked === 5, `${unlocked} åbne`);
  await page.getByRole('button', { name: /Låge 5, dagens låge/ }).click();
  // Lang timeout: headless-browsere uden GPU renderer 3D-lågerne langsomt
  await page.getByRole('dialog').waitFor({ timeout: 30000 });
  check('Låge 5 åbner med vendespil', await page.locator('.memory-grid').isVisible());
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Låge 2 / }).click();
  await page.getByRole('button', { name: 'Vis svaret' }).click({ timeout: 30000 });
  check('Gåde kan løses', await page.getByText('En skorsten!').isVisible());
  await page.keyboard.press('Escape');
  const lockedClick = page.getByRole('button', { name: /Låge 6 – låst/ });
  await lockedClick.click({ force: true });
  await page.waitForTimeout(400);
  check('Låst låge kan ikke åbnes', (await page.getByRole('dialog').count()) === 0);
  const opened = await page.evaluate(() => localStorage.getItem('nordpolen:aabnede-laager-2026'));
  check('Åbnede låger gemmes lokalt', opened === '[5,2]', opened ?? 'null');

  /* ---------- juleaften ---------- */
  await page.goto(base + '/?tid=2026-12-24T19:25', { waitUntil: 'domcontentloaded' });
  await page.getByText('Den store juleflyvning 2026').first().waitFor({ timeout: 15000 });
  check('Juleaften: juleflyvningen er aktiv', true);
  check('Juleaften: Glædelig jul vises', await page.getByText('Glædelig jul!').first().isVisible());
  await page.getByRole('button', { name: 'Tilbage til nu' }).click();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  check('Tidsmaskinen kan nulstilles', (await page.getByText('Tidsmaskine aktiv').count()) === 0);

  /* ---------- ønskeseddel ---------- */
  await page.goto(base + '/missioner', { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('Jeg ønsker mig …').fill('En kælk <script>alert(1)</script>');
  await page.getByRole('button', { name: 'Tilføj' }).click();
  check('Ønske tilføjes og vises som ren tekst', await page.getByText('En kælk <script>alert(1)</script>').isVisible());

  /* ---------- 404 ---------- */
  await page.goto(base + '/findes-ikke', { waitUntil: 'domcontentloaded' });
  await page.getByText('kanen er fløjet forkert').waitFor({ timeout: 15000 });
  check('404-side vises', true);

  /* ---------- admin ---------- */
  if (process.env.ADMIN_PASSWORD) {
    await page.goto(base + '/admin', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Brugernavn').fill(process.env.ADMIN_USER ?? 'julemanden');
    await page.getByLabel('Adgangskode').fill('forkert-kode');
    await page.getByRole('button', { name: 'Log ind' }).click();
    await page.getByText('Forkert brugernavn eller adgangskode').waitFor({ timeout: 5000 });
    check('Admin afviser forkert adgangskode', true);
    await page.getByLabel('Adgangskode').fill(process.env.ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Log ind' }).click();
    await page.getByRole('heading', { name: 'Kontrolcentralens styrepult' }).waitFor({ timeout: 10000 });
    check('Admin-login virker', true);
    await page.getByRole('button', { name: 'Driftsstatus' }).click();
    await page.getByLabel('Gaveproduktion').fill('99,9 %');
    await page.getByRole('button', { name: 'Gem ændringer' }).click();
    await page.getByText('Gemt!').waitFor({ timeout: 5000 });
    check('Admin kan gemme driftsstatus', true);
    await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
    await page.getByText('99,9 %').first().waitFor({ timeout: 10000 });
    check('Ændringen vises på forsiden', true);
    // ryd op
    await page.goto(base + '/admin#status', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Gaveproduktion').fill('');
    await page.getByRole('button', { name: 'Gem ændringer' }).click();
    await page.getByText('Gemt!').waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: 'Log ud' }).click();
    await page.getByRole('button', { name: 'Log ind' }).waitFor({ timeout: 5000 });
    check('Admin kan logge ud', true);
  } else {
    console.log('(admin-test sprunget over – sæt ADMIN_PASSWORD)');
  }
} catch (e) {
  check('Uventet fejl', false, e.message.split('\n')[0]);
}

const relevantErrors = errors.filter((e) => !/Failed to load resource.*(401|404)/.test(e));
check('Ingen JavaScript-fejl i konsollen', relevantErrors.length === 0, relevantErrors.slice(0, 3).join(' | '));
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} tjek bestået`);
process.exit(failed ? 1 : 0);
