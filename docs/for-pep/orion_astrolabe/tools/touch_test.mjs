// Real-touch test of the Orion Astrolabe on an emulated iPhone 13 (Playwright, hasTouch, isMobile).
//   node touch.mjs <chromium|webkit> <baseUrl> <suite>      suites: sow (See our worlds), home, rings, games, all
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/CC/listener-ic2/node_modules/');
const pw = require('playwright-core');
const [, , engine = 'chromium', BASE = 'http://127.0.0.1:8123', suite = 'all'] = process.argv;
const exe = { chromium: 'C:/Program Files/Google/Chrome/Application/chrome.exe', webkit: 'C:/Users/gpoli/AppData/Local/ms-playwright/webkit-2359/Playwright.exe' }[engine];
const dev = pw.devices['iPhone 13'];
const browser = await pw[engine].launch({ headless: true, executablePath: exe, args: engine === 'chromium' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : [] });
const results = [];
const errs = [];
function rec(name, ok, note) { results.push({ name, ok, note }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (note ? '  - ' + note : '')); }

async function pool(items, fn, n = 4) { let next = 0; const w = async () => { while (next < items.length) { const it = items[next++]; await fn(it); } }; await Promise.all(Array.from({ length: n }, w)); }
async function fresh(path = '/', opts = {}) {
  const ctx = await browser.newContext({ ...dev, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + ' @ ' + page.url()));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push('CONSOLE ' + m.text() + ' @ ' + page.url()); });
  page.external = [];
  page.on('request', (r) => { if (r.url().startsWith('mailto:')) page.external.push(r.url()); });
  await page.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:') || /orionlabstudio\.com/.test(u) && BASE.includes('orionlabstudio.com')) return route.continue();
    page.external.push(u); return route.abort();
  });
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(opts.wait || 3000);
  return page;
}
const scrollTo = async (page, y) => { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(1300); };
const VH = (page) => page.evaluate('innerHeight');
const sy = (page) => page.evaluate('Math.round(pageYOffset)');

// 1. "See our worlds" from the top: must FLY (smoothly) to the Cloud Chase stop and stay on the home page
async function suiteSow() {
  const page = await fresh('/');
  const astroOn = await page.evaluate("document.documentElement.classList.contains('astro-on')");
  rec('home loads with the animated instrument (astro-on)', astroOn);
  const vh = await VH(page);
  const link = page.locator('a[data-tab-link="cc"]').first();
  const probe = await page.evaluate(() => { const a = document.querySelector('a[data-tab-link="cc"]'); const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { hit: e ? (e.tagName + '.' + (e.className || '')).slice(0, 60) : null, isLink: !!(e && e.closest('a') === a) }; });
  rec('See our worlds: the tap point hits the link itself (nothing covers it)', probe.isLink, probe.hit);
  const samples = [];
  const t0 = Date.now();
  try { await link.tap({ timeout: 5000 }); } catch (e) { rec('See our worlds: the tap is accepted', false, String(e.message).split('\n').find((l) => /intercepts/.test(l)) || String(e.message).split('\n')[0]); }
  while (Date.now() - t0 < 4200) { samples.push(await sy(page)); await page.waitForTimeout(90); }
  const end = samples[samples.length - 1], target = Math.round(6.85 * vh);
  const mid = samples.filter((v) => v > 80 && v < target - 80);
  const path = await page.evaluate('location.pathname');
  const stopLive = await page.evaluate("document.querySelector('#cloudchase').classList.contains('live')");
  rec('See our worlds: stays on the home page (no dive into a game)', path === '/', 'path ' + path);
  rec('See our worlds: lands on the Cloud Chase stop (scroll ' + end + ' vs ' + target + ', stop live ' + stopLive + ')', Math.abs(end - target) < 12 && stopLive);
  rec('See our worlds: flies smoothly (' + mid.length + ' in-between frames, not a jump)', mid.length >= 6, 'first samples ' + samples.slice(0, 8).join(','));
  await page.context().close();
}

// 2. Every control of the home page, tapped for real, each one at its own stop
async function suiteHome() {
  const probe = await fresh('/');
  const vh = await VH(probe);
  const list = await probe.evaluate(() => {
    const out = []; const stops = [...document.querySelectorAll('[data-stop]')];
    [...document.querySelectorAll('a[href],button')].forEach((el, i) => {
      const st = el.closest('[data-stop]'); const w = st ? (st.getAttribute('data-win') || '').split(',').map(Number) : null;
      out.push({ i, tag: el.tagName, text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), href: el.getAttribute('href'), dive: el.getAttribute('data-dive'), tab: el.getAttribute('data-tab'), tabLink: el.getAttribute('data-tab-link'), where: el.closest('header') ? 'header' : el.closest('footer') ? 'footer' : st ? 'stop:' + st.getAttribute('data-stop') : el.closest('.after') ? 'after' : 'page', mid: w && w.length === 4 ? (w[1] + w[2]) / 2 : null, hidden: el.hidden || el.closest('[hidden]') != null });
    });
    return out;
  });
  await probe.context().close();
  console.log('home controls found: ' + list.length);
  await pool(list, async (c) => {
    const label = c.where + ' | ' + c.text + (c.href ? ' -> ' + c.href : '');
    if (c.tag === 'BUTTON') return;   // the sound button is tested for real (it must toggle) in the nav suite
    if (/Skip to content/.test(c.text)) { rec('[home] ' + label, true, 'keyboard-only link, off-screen until focused: not tappable by design'); return; }
    const page = await fresh('/', { wait: 2600 });
    if (c.mid != null) await scrollTo(page, Math.round(c.mid * vh));
    else if (c.where === 'footer' || c.where === 'after') { await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(900); }
    page.hit = [];
    await page.evaluate(() => { window.__tap = []; document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a,button'); window.__tap.push({ href: a && a.getAttribute('href'), prevented: e.defaultPrevented }); }, false); });
    const el = page.locator('a[href],button').nth(c.i);
    let note = '', ok = false;
    try {
      const y0 = await sy(page);
      await el.tap({ timeout: 6000 });
      await page.waitForTimeout(c.dive ? 3200 : 2400);
      const url = new URL(page.url()); const y1 = await sy(page);
      const href = c.href || '';
      if (c.dive) { ok = url.pathname === href; note = 'dived to ' + url.pathname; }
      else if (c.tab || c.tabLink) {
        const want = { home: 0, cc: 6.85 * vh, ss: 8.6 * vh, sb: 10.3 * vh }[c.tab || c.tabLink];
        if (c.tab === 'contact') { const r = await page.evaluate("Math.round(document.getElementById('contact').getBoundingClientRect().top)"); ok = r > -40 && r < vh * 0.6; note = 'contact top at ' + r; }
        else { ok = Math.abs(y1 - want) < 14 && url.pathname === '/'; note = 'scroll ' + y1 + ' (want ' + Math.round(want) + ') path ' + url.pathname; }
      }
      else if (href.startsWith('#')) { const id = href.slice(1); const r = await page.evaluate((i) => { const e = document.getElementById(i); return e ? Math.round(e.getBoundingClientRect().top) : null; }, id); ok = url.hash === href && url.pathname === '/'; note = 'hash ' + url.hash + (r != null ? ', section top ' + r : ''); }
      else if (href.startsWith('mailto:')) { const t = await page.evaluate('window.__tap').catch(() => null); const req = page.external.some((u) => u.startsWith('mailto:')); ok = !!(t && t.length > 0 && !t[0].prevented) || req; note = req ? 'mail link opened (the browser asked for ' + href + ')' : 'mail link opened (click reached it, not blocked)'; }
      else if (/^https?:/.test(href)) { ok = page.external.some((u) => u.startsWith(href.replace(/\/$/, ''))); note = 'requested ' + href; }
      else if (c.where === 'header' && /mark|orion/i.test(c.text) || (href === '/' && c.text.includes('orion'))) { ok = url.pathname === '/' && y1 <= 6; note = 'back at the start, scroll ' + y1; }
      else { ok = url.pathname === new URL(href, BASE + '/').pathname; note = 'opened ' + url.pathname; }
    } catch (e) { note = 'TAP FAILED: ' + String(e.message).split('\n')[0].slice(0, 150); }
    rec('[home] ' + label, ok, note);
    await page.context().close();
  });
}

// 3. The rings: a tap on empty sky over the ring that is on screen dives; over any other stop/text it must not.
//    The scan only covers the open sky: below the header bar and above the live card (never the tab row, never a card link).
async function skyBand(page) {
  return page.evaluate(() => { const bar = document.getElementById('bar').getBoundingClientRect().bottom; const cards = [...document.querySelectorAll('.stop.live .card, .stop[data-stop="hero"] .card')].map((c) => c.getBoundingClientRect().top).filter((t) => t > bar + 40); return [Math.round(bar + 8), Math.round(Math.min(innerHeight * 0.75, ...(cards.length ? cards : [innerHeight])) - 8)]; });
}
const flashOn = (page) => page.evaluate("(function(){var f=document.querySelector('.astro-flash');return f?+f.style.opacity>0.05:false})()").catch(() => true);
async function suiteRings() {
  const probe = await fresh('/'); const vh = await VH(probe); const vw = await probe.evaluate('innerWidth'); await probe.context().close();
  // a) at the top, with other rings merely passing in the sky: scanning the whole open sky must NEVER start a dive
  {
    const page = await fresh('/'); let dived = null, n = 0; const [y0, y1] = await skyBand(page);
    for (let y = y0; y < y1; y += 16) for (let x = 12; x < vw; x += 16) {
      await page.touchscreen.tap(x, y); n++; await page.waitForTimeout(20);
      if (new URL(page.url()).pathname !== '/' || await flashOn(page)) { dived = [x, y]; break; }
    }
    rec('hero stop: ' + n + ' taps over the open sky (y ' + y0 + '-' + y1 + ') start no dive (no ring is lit for this stop)', !dived, dived ? 'dive at ' + dived : '');
    await page.context().close();
  }
  // b) at each game stop: a tap on the sky over its medallion dives into that game; taps on its card text never do
  for (const [k, s, path] of [['cc', 6.85, '/cloudchase/'], ['ss', 8.6, '/spellshore/'], ['sb', 10.3, '/shaftbound/']]) {
    const page = await fresh('/'); await scrollTo(page, Math.round(s * vh));
    let hit = null, n = 0; const [y0, y1] = await skyBand(page);
    outer: for (let y = y0; y < y1; y += 12) for (let x = 10; x < vw; x += 12) {
      await page.touchscreen.tap(x, y); n++; await page.waitForTimeout(18);
      if (await flashOn(page)) { hit = [x, y]; break outer; }
    }
    await page.waitForTimeout(2800);
    const p = new URL(page.url()).pathname;
    rec('ring ' + k + ': a tap on the open sky over its medallion dives into ' + path, !!hit && p === path, hit ? 'first hit at ' + hit + ' after ' + n + ' taps (sky band y ' + y0 + '-' + y1 + '), landed ' + p : 'no hot-zone found in ' + n + ' taps');
    await page.context().close();
    const pg2 = await fresh('/'); await scrollTo(pg2, Math.round(s * vh));
    const box = await pg2.evaluate((key) => { const c = document.querySelector('[data-stop="' + key + '"] .card'); const r = c.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; }, k);
    let moved = false, taps = 0;
    for (let fy = 0.1; fy <= 0.9; fy += 0.2) for (let fx = 0.1; fx <= 0.9; fx += 0.2) {
      const x = box.l + box.w * fx, y = box.t + box.h * fy; const tgt = await pg2.evaluate(([a, b]) => { const e = document.elementFromPoint(a, b); return !!e && !e.closest('a'); }, [x, y]);
      if (!tgt) continue;
      await pg2.touchscreen.tap(x, y); taps++; await pg2.waitForTimeout(120);
      if (new URL(pg2.url()).pathname !== '/') moved = true;
    }
    await pg2.waitForTimeout(1500);
    rec('stop ' + k + ': ' + taps + ' taps on its card text and gaps do not dive', !moved && taps > 3 && new URL(pg2.url()).pathname === '/');
    await pg2.context().close();
  }
  // c) the hidden stops' cards cover nothing, at EVERY stop: no point of the screen belongs to a card that is not on screen
  {
    const page = await fresh('/'); const bad = [];
    for (const s of [0, 2, 4.2, 6.85, 8.6, 10.3, 12.3]) {
      await scrollTo(page, Math.round(s * vh));
      const r = await page.evaluate(() => { const o = []; for (let y = 100; y < innerHeight; y += 30) for (let x = 14; x < innerWidth; x += 30) { const e = document.elementFromPoint(x, y); const st = e && e.closest('[data-stop]'); if (st && !st.classList.contains('live') && +st.style.opacity < 0.5 && !(st.getAttribute('data-stop') === 'hero' && +st.style.opacity >= 0.5)) o.push(st.getAttribute('data-stop') + '@' + x + ',' + y); } return o; });
      if (r.length) bad.push('s=' + s + ': ' + r.slice(0, 3).join(' '));
    }
    rec('at 7 scroll positions no point of the screen belongs to a stop that is not on screen', bad.length === 0, bad.join(' | '));
    await page.context().close();
  }
  // d) Betelgeuse: three taps make the supernova flare, only while the Orion stop is on screen
  {
    const page = await fresh('/'); await scrollTo(page, Math.round(4.2 * vh)); const [y0, y1] = await skyBand(page);
    let hit = null;
    outer2: for (let y = y0; y < y1; y += 14) for (let x = 10; x < vw; x += 14) {
      await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y); await page.touchscreen.tap(x, y); await page.waitForTimeout(40);
      if (await flashOn(page)) { hit = [x, y]; break outer2; }
    }
    rec('Orion stop: three taps on Betelgeuse flare the supernova', !!hit, hit ? 'at ' + hit : 'not found');
    await page.context().close();
    for (const [lab, s] of [['hero', 0]]) {
      const p2 = await fresh('/'); await scrollTo(p2, Math.round(s * vh)); const [a0, a1] = await skyBand(p2); let flare = false, n = 0;
      for (let y = a0; y < a1 && !flare; y += 28) for (let x = 10; x < vw; x += 28) { await p2.touchscreen.tap(x, y); await p2.touchscreen.tap(x, y); await p2.touchscreen.tap(x, y); n++; if (new URL(p2.url()).pathname !== '/') break; if (await flashOn(p2)) { flare = true; break; } }
      rec(lab + ' stop: Betelgeuse is not live (triple taps at ' + n + ' sky points: no supernova, no dive)', !flare);
      await p2.context().close();
    }
  }
}

// 3b. The mark and the Home tab, from every stop: a smooth fly back to the start, still on the home page
async function suiteNav() {
  const probe = await fresh('/'); const vh = await VH(probe); await probe.context().close();
  for (const [lab, sel] of [['mark', '#bar a.mark'], ['Home tab', '#bar a[data-tab="home"]']]) {
    for (const [stop, s] of [['Cloud Chase', 6.85], ['Spell Shore', 8.6], ['Shaft Bound', 10.3], ['contact', 'contact']]) {
      const page = await fresh('/');
      if (s === 'contact') { await page.evaluate("document.getElementById('contact').scrollIntoView()"); await page.waitForTimeout(1200); } else await scrollTo(page, Math.round(s * vh));
      const y0 = await sy(page); const samples = [];
      try { await page.locator(sel).first().tap({ timeout: 5000 }); } catch (e) { rec(lab + ' from ' + stop + ': tap accepted', false, String(e.message).split('\n')[0].slice(0, 120)); await page.context().close(); continue; }
      const t0 = Date.now(); while (Date.now() - t0 < 4800) { samples.push(await sy(page)); await page.waitForTimeout(90); }
      const end = samples[samples.length - 1], mid = samples.filter((v) => v > 80 && v < y0 - 80);
      rec(lab + ' from ' + stop + ' (scroll ' + y0 + '): flies back to the very start (now ' + end + ') smoothly (' + mid.length + ' in-between frames), still on the home page', end <= 3 && mid.length >= 5 && new URL(page.url()).pathname === '/');
      await page.context().close();
    }
  }
  // the sound button actually toggles
  const pg = await fresh('/');
  const b = pg.locator('button.snd'); const before = await b.getAttribute('aria-pressed');
  try { await b.tap({ timeout: 4000 }); await pg.waitForTimeout(500); const after = await b.getAttribute('aria-pressed'); rec('Sound button: tap toggles it (' + before + ' -> ' + after + ')', before !== after); } catch (e) { rec('Sound button: tap accepted', false, String(e.message).split('\n')[0].slice(0, 120)); }
  await pg.context().close();
}

// 4. The three game pages: every link and button, tapped
async function suiteGames() {
  for (const path of ['/cloudchase/', '/spellshore/', '/shaftbound/']) {
    const probe = await fresh(path);
    const list = await probe.evaluate(() => [...document.querySelectorAll('a[href],button')].map((el, i) => ({ i, text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), href: el.getAttribute('href'), where: el.closest('header') ? 'header' : el.closest('footer') ? 'footer' : 'page', hidden: !!(el.hidden || el.closest('[hidden]')) })));
    await probe.context().close();
    console.log(path + ' controls found: ' + list.length);
    await pool(list, async (c) => {
      const label = path + ' ' + c.where + ' | ' + c.text + (c.href ? ' -> ' + c.href : '');
      if (/Skip to content/.test(c.text)) { rec('[game] ' + label, true, 'keyboard-only link, off-screen until focused'); return; }
      const page = await fresh(path, { wait: 2200 });
      let ok = false, note = '';
      try {
        await page.evaluate(() => { window.__tap = []; document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a,button'); window.__tap.push({ prevented: e.defaultPrevented }); }, false); });
        await page.locator('a[href],button').nth(c.i).tap({ timeout: 6000 });
        await page.waitForTimeout(1800);
        const url = new URL(page.url()); const href = c.href || '';
        if (href.startsWith('mailto:')) { const t = await page.evaluate('window.__tap').catch(() => null); const req = page.external.some((u) => u.startsWith('mailto:')); ok = !!(t && t.length > 0 && !t[0].prevented) || req; note = 'mail link opened'; }
        else if (/^https?:/.test(href) && !href.startsWith(BASE)) { ok = page.external.some((u) => u.startsWith(href.replace(/\/$/, ''))); note = 'requested ' + href; }
        else { const want = new URL(href, BASE + path); ok = url.pathname === want.pathname && (want.hash ? url.hash === want.hash : true); note = 'opened ' + url.pathname + url.hash; }
      } catch (e) { note = 'TAP FAILED: ' + String(e.message).split('\n')[0].slice(0, 150); }
      rec('[game] ' + label, ok, note);
      await page.context().close();
    });
  }
}

try {
  if (suite === 'sow' || suite === 'all') await suiteSow();
  if (suite === 'home' || suite === 'all') await suiteHome();
  if (suite === 'rings' || suite === 'all') await suiteRings();
  if (suite === 'nav' || suite === 'all') await suiteNav();
  if (suite === 'games' || suite === 'all') await suiteGames();
} finally { await browser.close(); }
const bad = results.filter((r) => !r.ok);
console.log('\n' + engine + ' ' + BASE + ' suite ' + suite + ': ' + (results.length - bad.length) + '/' + results.length + ' passed, ' + bad.length + ' failed');
bad.forEach((r) => console.log('  FAILED: ' + r.name + ' - ' + r.note));
console.log('page errors: ' + errs.length); errs.slice(0, 8).forEach((e) => console.log('  ' + e));
