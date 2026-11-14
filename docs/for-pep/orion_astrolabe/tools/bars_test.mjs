// The same top bar on every page: structure, phone reachability (390 and 360 wide) and a real touch tap on every tab and
// every second-row link of every page (emulated iPhone 13). mailto:/tel: links are stubbed, never handed to Windows.
//   node bars.mjs <chromium|webkit> <baseUrl> [structure|taps|all]
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/CC/listener-ic2/node_modules/');
const pw = require('playwright-core');
const [, , engine = 'chromium', BASE = 'http://127.0.0.1:8123', what = 'all'] = process.argv;
const exe = { chromium: 'C:/Program Files/Google/Chrome/Application/chrome.exe', webkit: 'C:/Users/gpoli/AppData/Local/ms-playwright/webkit-2359/Playwright.exe' }[engine];
const browser = await pw[engine].launch({ headless: true, executablePath: exe, args: engine === 'chromium' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : [] });
const MAIL_STUB = "window.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href^=\"mailto:\"],a[href^=\"tel:\"]');if(!a)return;(window.__mail=window.__mail||[]).push({href:a.getAttribute('href'),prevented:e.defaultPrevented});e.preventDefault();},false);";
const G = { cloudchase: ['Cloud Chase', ['Game', 'Support', 'Privacy', 'Terms', 'Delete your data']], spellshore: ['Spell Shore', ['Game', 'For parents', 'Support', 'Privacy', 'Terms', 'Delete your data']], shaftbound: ['Shaft Bound', ['Game', 'For parents', 'Support', 'Privacy', 'Terms', 'Delete your data']] };
const SUBPATH = { 'Game': '', 'For parents': 'parents/', 'Support': 'support/', 'Privacy': 'privacy/', 'Terms': 'terms/', 'Delete your data': 'delete-data/' };
const PAGES = ['/', '/cloudchase/', '/spellshore/', '/shaftbound/', '/cloudchase/privacy/', '/cloudchase/terms/', '/cloudchase/support/', '/cloudchase/delete-data/', '/spellshore/privacy/', '/spellshore/terms/', '/spellshore/support/', '/spellshore/delete-data/', '/spellshore/parents/', '/shaftbound/privacy/', '/shaftbound/terms/', '/shaftbound/support/', '/shaftbound/delete-data/', '/shaftbound/parents/', '/legal/', '/privacy/', '/terms/', '/accessibility/', '/404.html'];
if (process.env.ONLY) { const keep = process.env.ONLY.split(','); for (let i = PAGES.length - 1; i >= 0; i--) if (!keep.includes(PAGES[i])) PAGES.splice(i, 1); }
const TABS = ['Home', 'Cloud Chase', 'Spell Shore', 'Shaft Bound', 'Contact'];
const TABHREF = { 'Home': '/', 'Cloud Chase': '/cloudchase/', 'Spell Shore': '/spellshore/', 'Shaft Bound': '/shaftbound/', 'Contact': '/#contact' };
let pass = 0, fail = 0; const errs = [];
const say = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); ok ? pass++ : fail++; };
async function pool(items, fn, n = 5) { let next = 0; const w = async () => { while (next < items.length) { const it = items[next++]; try { await fn(it); } catch (e) { say(false, 'test error on ' + JSON.stringify(it).slice(0, 80) + ': ' + String(e.message).split('\n')[0].slice(0, 160)); } } }; await Promise.all(Array.from({ length: n }, w)); }
async function open(path, vp) {
  const ctx = await browser.newContext(vp.touch ? { ...pw.devices['iPhone 13'], viewport: { width: vp.w, height: vp.h } } : { viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(MAIL_STUB);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(path + ' ' + vp.w + ': ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(path + ' ' + vp.w + ': ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) errs.push(path + ' ' + vp.w + ': HTTP ' + r.status() + ' ' + r.url()); });
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(/^\/(|cloudchase\/|spellshore\/|shaftbound\/)$/.test(path) ? 2300 : 900);
  return page;
}
const gameOf = (path) => { const t = path.split('/')[1]; return G[t] ? t : null; };
const homeIcon = await (async () => { const p = await open('/', { w: 1440, h: 900 }); const h = await p.evaluate("(document.querySelector('link[rel=icon]')||{}).href"); await p.context().close(); return h; })();

async function structure(path, vp) {
  const page = await open(path, vp); const g = gameOf(path); const tag = vp.w + ' ' + path + ': ';
  const d = await page.evaluate(() => {
    const bar = document.getElementById('bar'); if (!bar) return null;
    const txt = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim();
    const main = bar.querySelector('.wrap > nav'), sub = bar.querySelector('nav.subbar');
    const rect = (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), top: Math.round(r.top), bot: Math.round(r.bottom) }; };
    const row = (n) => n ? { box: rect(n), max: n.scrollWidth - n.clientWidth, cls: n.className, links: [...n.querySelectorAll('a')].map((a) => ({ t: txt(a), href: a.getAttribute('href'), on: a.classList.contains('on'), cur: a.getAttribute('aria-current'), ...rect(a) })) } : null;
    const first = [...document.querySelectorAll('main h1, main .eyebrow, main .kick')].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').map((e) => e.getBoundingClientRect().top).sort((a, b) => a - b)[0];
    return { mark: txt(bar.querySelector('a.mark')), markHref: bar.querySelector('a.mark').getAttribute('href'), headers: document.querySelectorAll('header').length, oldNav: document.querySelectorAll('header.nav, .brand').length,
      main: row(main), sub: row(sub), subLabel: sub ? sub.getAttribute('aria-label') : null, barBottom: Math.round(bar.getBoundingClientRect().bottom), barPos: getComputedStyle(bar).position, first: Math.round(first),
      icon: (document.querySelector('link[rel=icon]') || {}).href, icons: document.querySelectorAll('link[rel=icon]').length, sw: document.documentElement.scrollWidth, vw: innerWidth };
  });
  if (!d) { say(false, tag + 'no #bar'); await page.context().close(); return; }
  const tabs = d.main.links.map((l) => l.t), lit = d.main.links.filter((l) => l.on).map((l) => l.t);
  const wantLit = g ? [G[g][0]] : path === '/' ? ['Home'] : [];
  say(d.mark === 'orion lab studios' && d.markHref === '/' && d.headers === 1 && d.oldNav === 0, tag + 'one bar with the studio mark "' + d.mark + '" -> ' + d.markHref + ' (old game header gone)');
  say(JSON.stringify(tabs) === JSON.stringify(TABS), tag + 'tabs: ' + tabs.join(' | '));
  if (path !== '/') say(d.main.links.every((l) => l.href === TABHREF[l.t]), tag + 'tab links: ' + d.main.links.map((l) => l.href).join(' '));
  say(JSON.stringify(lit) === JSON.stringify(wantLit), tag + 'highlighted tab: ' + (lit.join(',') || 'none') + ' (expected ' + (wantLit.join(',') || 'none') + ')');
  if (g) {
    const want = G[g][1], got = d.sub ? d.sub.links.map((l) => l.t) : [];
    const hrefOk = d.sub && d.sub.links.every((l) => l.href === '/' + g + '/' + SUBPATH[l.t]);
    const cur = d.sub ? d.sub.links.filter((l) => l.cur).map((l) => l.href) : [];
    say(JSON.stringify(got) === JSON.stringify(want) && hrefOk && d.subLabel === G[g][0], tag + 'second row (' + d.subLabel + '): ' + got.join(' | '));
    say(cur.length === 1 && cur[0] === path, tag + 'second row marks this page: ' + cur.join(','));
  } else say(!d.sub, tag + 'no second row (not a game page)');
  const mustBeHome = g === 'spellshore' || g === 'shaftbound' || path === '/';
  say(d.icons === 1 && !!d.icon && (!mustBeHome || d.icon === homeIcon), tag + 'one icon link' + (mustBeHome ? ', the home page icon' : ' (this page keeps the icon it already had)'));
  say(d.sw <= d.vw, tag + 'no sideways page scroll (' + d.sw + ' of ' + d.vw + ')');
  say(d.barPos === 'fixed' && d.first >= d.barBottom, tag + 'the bar (bottom ' + d.barBottom + ') does not cover the first line of the page (top ' + d.first + ')');
  // reachability: every link of both rows can be brought fully on screen; the lit/current one already is
  for (const [name, sel, row] of [['tab row', '#bar .wrap > nav', d.main], ['second row', '#bar nav.subbar', d.sub]]) {
    if (!row) continue;
    const litNow = row.links.filter((l) => l.on || l.cur);
    const litOk = litNow.every((l) => l.l >= 0 && l.r <= d.vw);
    const reach = await page.evaluate((s) => { const n = document.querySelector(s); const out = []; const vw = innerWidth; n.scrollLeft = 99999; const last = n.querySelector('li:last-child a').getBoundingClientRect(); out.push(Math.round(vw - last.right)); n.scrollLeft = 0; const firstA = n.querySelector('a').getBoundingClientRect(); out.push(Math.round(firstA.left)); return out; }, sel);
    // the fade must match where the row is scrolled to (bar.js may bring the current link back into view at any moment)
    let fadeCls = '', fadeOk = false; const scrolls = row.max > 2;
    for (let k = 0; k < 20 && !fadeOk; k++) { await page.waitForTimeout(100); const f = await page.evaluate((s) => { const n = document.querySelector(s); return { cls: n.className, sl: n.scrollLeft, max: n.scrollWidth - n.clientWidth }; }, sel); fadeCls = f.cls; const wantR = f.max > 2 && f.sl < f.max - 2, wantL = f.max > 2 && f.sl > 2; fadeOk = /fade-r/.test(f.cls) === wantR && /fade-l/.test(f.cls) === wantL; }
    say(litOk && reach[0] >= 8 && reach[1] >= 8 && fadeOk && (!scrolls || /fade-[lr]/.test(fadeCls)), tag + name + (scrolls ? ' scrolls sideways (fade "' + fadeCls.replace('subbar', '').trim() + '")' : ' fits') + ': last link ends ' + reach[0] + 'px inside the right edge, first starts ' + reach[1] + 'px in; highlighted link fully visible ' + litOk);
  }
  await page.context().close();
}

async function tap(job) {
  const [path, kind, label] = job; const g = gameOf(path);
  const page = await open(path, { w: 390, h: 844, touch: true });
  const vh = await page.evaluate('innerHeight');
  const sel = kind === 'mark' ? '#bar a.mark' : kind === 'tab' ? '#bar .wrap > nav a' : '#bar nav.subbar a';
  const loc = kind === 'mark' ? page.locator(sel) : page.locator(sel, { hasText: new RegExp('^' + label + '$', 'i') });
  let ok = false, note = '';
  try {
    await loc.first().tap({ timeout: 6000 });
    await page.waitForTimeout(2600);
    const u = new URL(page.url()); const y = await page.evaluate('Math.round(pageYOffset)');
    if (kind === 'mark' || label === 'Home') { ok = u.pathname === '/' && y <= 3; note = 'opened ' + u.pathname + ' at the top (scroll ' + y + ')'; }
    else if (label === 'Contact') { const t = await page.evaluate("Math.round(document.getElementById('contact').getBoundingClientRect().top)"); ok = u.pathname === '/' && t > -60 && t < vh * 0.7; note = 'opened ' + u.pathname + u.hash + ', contact section at ' + t + ' of ' + vh; }
    else if (kind === 'tab') { ok = u.pathname === TABHREF[label]; note = 'opened ' + u.pathname; }
    else { const want = '/' + g + '/' + SUBPATH[label]; ok = u.pathname === want; note = 'opened ' + u.pathname; }
    if (ok && kind !== 'mark' && u.pathname !== '/') {   // the page we landed on shows the right highlight
      const lit = await page.evaluate(() => [...document.querySelectorAll('#bar .wrap > nav a.on')].map((a) => a.textContent.trim()).join(','));
      const g2 = gameOf(u.pathname); const want = g2 ? G[g2][0] : '';
      if (lit !== want) { ok = false; note += '; but highlighted tab there is "' + lit + '", expected "' + want + '"'; }
    }
  } catch (e) { note = 'TAP FAILED: ' + (String(e.message).split('\n').find((l) => /intercepts/.test(l)) || String(e.message).split('\n')[0]).slice(0, 170); }
  say(ok, '[tap] ' + path + ' | ' + (kind === 'mark' ? 'star mark' : kind === 'tab' ? 'tab ' + label : 'second row ' + label) + '  - ' + note);
  await page.context().close();
}

try {
  if (what === 'structure' || what === 'all') {
    const jobs = []; for (const vp of [{ w: 390, h: 844, touch: true }, { w: 360, h: 740, touch: true }, { w: 768, h: 1024, touch: true }, { w: 1024, h: 768 }, { w: 1440, h: 900 }]) for (const p of PAGES) jobs.push([p, vp]);
    await pool(jobs, (j) => structure(j[0], j[1]));
  }
  if (what === 'taps' || what === 'all') {
    const jobs = [];
    for (const p of PAGES) { if (p === '/') continue; jobs.push([p, 'mark', '']); for (const t of TABS) jobs.push([p, 'tab', t]); const g = gameOf(p); if (g) for (const l of G[g][1]) jobs.push([p, 'sub', l]); }
    console.log('tap jobs: ' + jobs.length);
    await pool(jobs, tap);
  }
} finally { await browser.close(); }
console.log('\nbars ' + engine + ' ' + BASE + ' ' + what + ': ' + pass + ' passed, ' + fail + ' failed; page errors ' + errs.length);
errs.slice(0, 10).forEach((e) => console.log('  ' + e));
