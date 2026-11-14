// The home page's camera flights: how long they take, their ease, that any input stops them, reduce motion.
//   node flight.mjs <chromium|webkit> <baseUrl>
// Records the page's own scroll position every animation frame (in the page), so the timing is the page's, not the harness's.
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/CC/listener-ic2/node_modules/');
const pw = require('playwright-core');
const [, , engine = 'chromium', BASE = 'http://127.0.0.1:8123'] = process.argv;
const exe = { chromium: 'C:/Program Files/Google/Chrome/Application/chrome.exe', webkit: 'C:/Users/gpoli/AppData/Local/ms-playwright/webkit-2359/Playwright.exe' }[engine];
const browser = await pw[engine].launch({ headless: true, executablePath: exe, args: engine === 'chromium' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : [] });
const MAIL_STUB = "window.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href^=\"mailto:\"],a[href^=\"tel:\"]');if(!a)return;(window.__mail=window.__mail||[]).push({href:a.getAttribute('href'),prevented:e.defaultPrevented});e.preventDefault();},false);";
let pass = 0, fail = 0; const errs = [];
function rec(name, ok, note) { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (note ? '  - ' + note : '')); }
const expDur = (dist) => Math.min(3200, Math.max(1500, 1300 + dist * 220));

async function fresh(view, reduce) {
  const opts = view === 390 ? { ...pw.devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } };
  const ctx = await browser.newContext({ ...opts, serviceWorkers: 'block', reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(MAIL_STUB);
  const page = await ctx.newPage();
  // MUTATE=old : serve astro.js with the old timing and no stop-on-input, to prove this test goes red
  if (process.env.MUTATE === 'old') await page.route('**/astro/astro.js', async (route) => { const r = await route.fetch(); let t = await r.text();
    const a = t.replace('clamp(1300 + dist * 220, 1500, 3200)', 'clamp(700 + dist * 140, 800, 2200)').replace(/\['wheel', 'touchstart', 'keydown', 'pointerdown', 'mousedown'\]\.forEach\([^\n]*\n/, '\n');
    if (a === t || a.includes('pointerdown')) throw new Error('mutation did not apply'); return route.fulfill({ response: r, body: a }); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(BASE + '/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  return page;
}
const tapOrClick = async (page, view, loc) => view === 390 ? loc.tap({ timeout: 5000 }) : loc.click({ timeout: 5000 });
// start recording scroll positions (page time) from now
// one recorder at a time: a new one ends the previous loop (two loops into one array mixed their clocks)
const startRec = (page) => page.evaluate(() => { const gen = window.__recGen = (window.__recGen || 0) + 1; const rec = window.__rec = []; const t0 = performance.now(); (function f() { if (window.__recGen !== gen) return; rec.push([performance.now() - t0, window.pageYOffset, !!(window.AstroFlying && window.AstroFlying())]); if (rec.length < 2000) requestAnimationFrame(f); })(); });
const getRec = (page) => page.evaluate('window.__rec');
async function waitStill(page, ms = 6000) { const t = Date.now(); await page.waitForTimeout(150); while (Date.now() - t < ms && await page.evaluate('!!(window.AstroFlying && window.AstroFlying())')) await page.waitForTimeout(50); }
// a point on the top bar that is neither a link nor the instrument (pressing it must do nothing but stop the flight)
const emptyBarPoint = (page) => page.evaluate(() => {
  const b = document.getElementById('bar').getBoundingClientRect(), m = document.querySelector('#bar a.mark').getBoundingClientRect();
  for (let x = innerWidth - 12; x > m.right; x -= 8) { const y = m.top + m.height / 2, e = document.elementFromPoint(x, y); if (e && !e.closest('a,button') && e.closest('#bar')) return [x, y]; }
  return null;
});
function analyse(r, y0, y1) {
  const moving = r.filter((s) => s[2]); if (!moving.length) return null;
  const tStart = r.find((s) => s[1] !== y0) || moving[0], last = moving[moving.length - 1];
  const dur = last[0] - moving[0][0];
  const prog = (frac) => { const t = moving[0][0] + dur * frac; const s = r.reduce((a, b) => Math.abs(b[0] - t) < Math.abs(a[0] - t) ? b : a); return (s[1] - y0) / (y1 - y0); };
  return { dur, p10: prog(0.1), p50: prog(0.5), p90: prog(0.9), frames: moving.length, end: r[r.length - 1][1] };
}

for (const view of [1440, 390]) {
  // 1. "See our worlds" from the top: the timing and the ease
  {
    const page = await fresh(view);
    const vh = await page.evaluate('innerHeight'), y1 = Math.round(6.85 * vh);
    await startRec(page);
    await tapOrClick(page, view, page.locator('a[data-tab-link="cc"]').first());
    await waitStill(page); await page.waitForTimeout(300);
    const a = analyse(await getRec(page), 0, y1), want = expDur(6.85 * vh / vh);
    rec(`@${view} See our worlds: lasts about ${want} ms`, a && Math.abs(a.dur - want) < 250, a && `measured ${Math.round(a.dur)} ms over ${a.frames} frames`);
    rec(`@${view} See our worlds: gentle start (10% of the time -> under 4% of the way)`, a && a.p10 < 0.04, a && 'at 10%: ' + (a.p10 * 100).toFixed(1) + '%');
    rec(`@${view} See our worlds: glides through the middle (50% of the time -> 40-60% of the way)`, a && a.p50 > 0.4 && a.p50 < 0.6, a && 'at 50%: ' + (a.p50 * 100).toFixed(1) + '%');
    rec(`@${view} See our worlds: soft settle (90% of the time -> over 96% of the way)`, a && a.p90 > 0.96, a && 'at 90%: ' + (a.p90 * 100).toFixed(1) + '%');
    rec(`@${view} See our worlds: lands on the Cloud Chase stop`, a && Math.abs(a.end - y1) < 12, a && 'scroll ' + a.end + ' vs ' + y1);
    // 2. the Home tab back to the start, same timing rule
    const home = view === 390 ? page.locator('#bar a[data-tab="home"]') : page.locator('#bar a[data-tab="home"]');
    const yA = await page.evaluate('Math.round(pageYOffset)');
    await startRec(page); await tapOrClick(page, view, home.first()); await waitStill(page); await page.waitForTimeout(300);
    const b = analyse(await getRec(page), yA, 0), wantB = expDur(yA / vh);
    rec(`@${view} Home tab back to the start: lasts about ${wantB} ms and ends at the top`, b && Math.abs(b.dur - wantB) < 250 && b.end <= 3, b && `measured ${Math.round(b.dur)} ms, ends at ${b.end}`);
    rec(`@${view} Home tab back to the start: same ease (gentle start, soft settle)`, b && b.p10 < 0.04 && b.p90 > 0.96, b && `10%: ${(b.p10 * 100).toFixed(1)}%, 90%: ${(b.p90 * 100).toFixed(1)}%`);
    await page.context().close();
  }
  // 3. the mark from the Shaft Bound stop (the longest flight: capped)
  {
    const page = await fresh(view);
    const vh = await page.evaluate('innerHeight');
    await page.evaluate((y) => scrollTo(0, y), Math.round(10.3 * vh)); await page.waitForTimeout(1500);
    const yA = await page.evaluate('Math.round(pageYOffset)');
    await startRec(page); await tapOrClick(page, view, page.locator('#bar a.mark').first()); await waitStill(page); await page.waitForTimeout(300);
    const b = analyse(await getRec(page), yA, 0), want = expDur(yA / vh);
    rec(`@${view} mark from Shaft Bound: lasts about ${want} ms, ends at the top, still on the home page`, b && Math.abs(b.dur - want) < 250 && b.end <= 3 && new URL(page.url()).pathname === '/', b && `measured ${Math.round(b.dur)} ms, ends at ${b.end}`);
    await page.context().close();
  }
  // 4. any input during a flight stops it where it is
  const inputs = view === 390 ? ['touch', 'key'] : ['wheel', 'click', 'key'];
  for (const kind of inputs) {
    const page = await fresh(view);
    const vh = await page.evaluate('innerHeight'), y1 = Math.round(6.85 * vh);
    const pt = await emptyBarPoint(page);
    if (!pt) { rec(`@${view} ${kind} stops a flight: found an empty spot on the bar`, false); await page.context().close(); continue; }
    await tapOrClick(page, view, page.locator('a[data-tab-link="cc"]').first());
    const tw = Date.now(); while (Date.now() - tw < 3000 && (await page.evaluate('pageYOffset')) < y1 * 0.3) await page.waitForTimeout(20);
    const before = await page.evaluate('!!window.AstroFlying()');
    const stops0 = await page.evaluate('window.AstroFlightStopped || 0');
    if (kind === 'wheel') { await page.mouse.move(pt[0], 400); await page.mouse.wheel(0, 120); }
    else if (kind === 'click') await page.mouse.click(pt[0], pt[1]);
    else if (kind === 'touch') await page.touchscreen.tap(pt[0], pt[1]);
    else await page.keyboard.press('Shift');
    const yAt = await page.evaluate('pageYOffset');
    await page.waitForTimeout(80);
    const flying = await page.evaluate('!!window.AstroFlying()'), stops1 = await page.evaluate('window.AstroFlightStopped || 0');
    const y80 = await page.evaluate('pageYOffset');
    await page.waitForTimeout(kind === 'wheel' ? 1200 : 1000);
    const yEnd = await page.evaluate('pageYOffset');
    const moveAfter = Math.abs(yEnd - y80);
    const ok = before && !flying && stops1 === stops0 + 1 && Math.abs(yEnd - y1) > vh * 0.5 && (kind === 'wheel' ? true : moveAfter < 3);
    rec(`@${view} ${kind} during a flight stops it where it is`, ok, `flying before ${before}, after ${flying}; stopped at ${Math.round(yAt)}, ${Math.round(yEnd)} a second later (target ${y1}), path ${new URL(page.url()).pathname}`);
    await page.context().close();
  }
  // 5. reduce motion: still an instant jump
  {
    const page = await fresh(view, true);
    const on = await page.evaluate("document.documentElement.classList.contains('astro-on')");
    await startRec(page);
    await tapOrClick(page, view, page.locator('a[data-tab-link="cc"]').first());
    await page.waitForTimeout(800);
    const r = await getRec(page), y0 = r[0][1], yEnd = r[r.length - 1][1];
    const between = new Set(r.map((s) => Math.round(s[1])).filter((v) => v !== Math.round(y0) && v !== Math.round(yEnd)));
    const target = await page.evaluate("Math.round(document.getElementById('cloudchase').getBoundingClientRect().top)");
    rec(`@${view} reduce motion: See our worlds jumps instantly (no in-between frames)`, !on && yEnd > y0 + 100 && between.size === 0 && Math.abs(target) < 120, `astro-on ${on}, ${Math.round(y0)} -> ${Math.round(yEnd)}, ${between.size} in-between positions, section top at ${target}`);
    await page.context().close();
  }
}
console.log('page errors: ' + errs.length); errs.forEach((e) => console.log('  ' + e));
rec('no console errors and no page errors in the run', errs.length === 0, errs.length + ' found');
console.log(`flight ${engine} ${BASE}: ${pass}/${pass + fail} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
