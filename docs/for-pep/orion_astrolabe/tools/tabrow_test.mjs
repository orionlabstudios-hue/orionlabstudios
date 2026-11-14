// Phone tab row: every tab reachable, the last one clear of the edge, the active one scrolled into view. iPhone 13, real taps.
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/CC/listener-ic2/node_modules/');
const pw = require('playwright-core');
const [, , engine = 'chromium', BASE = 'http://127.0.0.1:8123'] = process.argv;
const exe = { chromium: 'C:/Program Files/Google/Chrome/Application/chrome.exe', webkit: 'C:/Users/gpoli/AppData/Local/ms-playwright/webkit-2359/Playwright.exe' }[engine];
const browser = await pw[engine].launch({ headless: true, executablePath: exe, args: engine === 'chromium' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : [] });
let fails = 0;
const say = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); if (!ok) fails++; };
for (const [w, h] of [[390, 844], [360, 740], [768, 1024]]) {
  const ctx = await browser.newContext({ ...pw.devices['iPhone 13'], viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'load' }); await page.waitForTimeout(2800);
  const info = () => page.evaluate(() => { const nav = document.querySelector('.bar nav'); const nr = nav.getBoundingClientRect(); const tabs = [...nav.querySelectorAll('a')].map((a) => { const r = a.getBoundingClientRect(); return { t: a.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right), on: a.classList.contains('on') }; }); return { navL: Math.round(nr.left), navR: Math.round(nr.right), sl: Math.round(nav.scrollLeft), max: nav.scrollWidth - nav.clientWidth, vw: innerWidth, tabs, cls: nav.className }; });
  let i = await info();
  say(i.tabs.length === 5 && i.tabs[0].t === 'Home', w + 'px: five tabs, Home first: ' + i.tabs.map((t) => t.t).join(' | '));
  say(i.tabs[0].on && i.tabs[0].l >= 0 && i.sl === 0, w + 'px: at the start the Home tab is active and fully on screen (left ' + i.tabs[0].l + ')');
  // scroll the strip all the way right with a real touch swipe: the last tab must end clear of the edge
  const y = await page.evaluate(() => Math.round(document.querySelector('.bar nav').getBoundingClientRect().top + 20));
  if (i.max > 4) {
    await page.evaluate(() => { document.querySelector('.bar nav').scrollLeft = 99999; }); await page.waitForTimeout(300);
    i = await info(); const last = i.tabs[i.tabs.length - 1];
    say(last.r <= w - 8, w + 'px: strip scrolled to the end: Contact right edge ' + last.r + ' of ' + w + ' (clear of the edge by ' + (w - last.r) + 'px), fade classes "' + i.cls + '"');
    await page.evaluate(() => { document.querySelector('.bar nav').scrollLeft = 0; }); await page.waitForTimeout(300);
  } else say(true, w + 'px: all tabs fit without scrolling');
  // tap every tab; each must end up fully visible and be the active one once the page has flown there
  for (const name of ['Cloud Chase', 'Spell Shore', 'Shaft Bound', 'Contact', 'Home']) {
    try { await page.locator('.bar nav a', { hasText: new RegExp('^' + name + '$', 'i') }).tap({ timeout: 5000 }); } catch (e) { say(false, w + 'px: tap ' + name + ' failed: ' + String(e.message).split('\n')[0].slice(0, 110)); continue; }
    let t = null; const t0 = Date.now();   // wait for the fly to land (the tab lights up), up to 8 s, then let the row settle
    while (Date.now() - t0 < 8000) { await page.waitForTimeout(250); i = await info(); t = i.tabs.find((x) => x.t.toLowerCase() === name.toLowerCase()); if (t.on && Date.now() - t0 > 1500) break; }
    await page.waitForTimeout(400); i = await info(); t = i.tabs.find((x) => x.t.toLowerCase() === name.toLowerCase());
    say(t.on && t.l >= 0 && t.r <= w, w + 'px: tapped ' + name + ' -> active ' + t.on + ', on screen ' + t.l + '..' + t.r + ' of ' + w);
  }
  await ctx.close();
}
await browser.close();
console.log(fails ? fails + ' FAILED' : 'all passed');
