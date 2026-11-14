// Content-Security-Policy check for every page of the site.
//   node csp_check.mjs <chromium|webkit> <baseUrl>
// Per page, at 1440x900 and on an emulated iPhone 13 (390): the CSP meta is there (right after charset) and the
// browser enforces it; the referrer meta is there; ZERO securitypolicyviolation events and ZERO "Refused"/CSP console
// messages; the head script ran (no-js removed / astro-on when WebGL); studio pages reveal all .rv text (docpage.js);
// game and home pages start the instrument canvas. Home: Sound on fetches the 4 sound slots (404 expected, but the
// requests must reach the server, i.e. not be blocked by connect-src).
// SELF-TEST first: the same real page served with one hash removed from its policy, and with an extra inline script,
// must each produce a violation - otherwise the detector is blind and every green below means nothing.
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/CC/listener-ic2/node_modules/');
const pw = require('playwright-core');
const [, , engine = 'chromium', BASE = 'http://127.0.0.1:8123'] = process.argv;
const exe = { chromium: 'C:/Program Files/Google/Chrome/Application/chrome.exe', webkit: 'C:/Users/gpoli/AppData/Local/ms-playwright/webkit-2359/Playwright.exe' }[engine];
const browser = await pw[engine].launch({ headless: true, executablePath: exe, args: engine === 'chromium' ? ['--use-angle=d3d11', '--ignore-gpu-blocklist'] : [] });
const PAGES = ['/', '/cloudchase/', '/spellshore/', '/shaftbound/', '/legal/', '/privacy/', '/terms/', '/accessibility/', '/404.html'];
for (const g of ['cloudchase', 'spellshore', 'shaftbound']) for (const s of ['privacy', 'terms', 'support', 'delete-data']) PAGES.push('/' + g + '/' + s + '/');
for (const g of ['spellshore', 'shaftbound']) PAGES.push('/' + g + '/parents/');
const MAIL_STUB = "window.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href^=\"mailto:\"],a[href^=\"tel:\"]');if(!a)return;(window.__mail=window.__mail||[]).push({href:a.getAttribute('href'),prevented:e.defaultPrevented});e.preventDefault();},false);";
const CSP_SPY = "window.__csp=[];document.addEventListener('securitypolicyviolation',function(e){window.__csp.push(e.violatedDirective+' '+(e.blockedURI||'')+' '+(e.sample||''))},true);";
let pass = 0, fail = 0; const errs = [];
function rec(name, ok, note) { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (note ? '  - ' + note : '')); }
async function pool(items, fn, n = 4) { let next = 0; const w = async () => { while (next < items.length) { const it = items[next++]; await fn(it); } }; await Promise.all(Array.from({ length: n }, w)); }

async function open(path, view, mutate) {
  const opts = view === 390 ? { ...pw.devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } };
  const ctx = await browser.newContext({ ...opts, serviceWorkers: 'block' });
  await ctx.addInitScript(MAIL_STUB); await ctx.addInitScript(CSP_SPY);
  const page = await ctx.newPage();
  page.cons = []; page.reqs = [];
  page.on('pageerror', (e) => page.cons.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || /Content.Security|Refused/i.test(m.text())) page.cons.push(m.type() + ' ' + m.text()); });
  page.on('response', (r) => page.reqs.push(r.status() + ' ' + r.url()));
  page.on('requestfailed', (r) => page.reqs.push('FAILED ' + r.url() + ' ' + (r.failure() || {}).errorText));
  await page.route('**/*', async (route) => {
    const u = route.request().url();
    if (!(u.startsWith(BASE) || u.startsWith('data:'))) { page.reqs.push('EXTERNAL ' + u); return route.abort(); }
    if (mutate && u === BASE + path) { const r = await route.fetch(); return route.fulfill({ response: r, body: mutate(await r.text()) }); }
    return route.continue();
  });
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  return { ctx, page };
}
const isCspMsg = (s) => /Content.Security.Policy|Refused to/i.test(s);

// ---------------- self-test: the detector must go red on the real page path
{
  const { ctx, page } = await open('/', 1440, (h) => h.replace(/'sha256-[^']+'/, "'sha256-AAAA'"));
  const v = await page.evaluate('window.__csp'), cls = await page.evaluate('document.documentElement.className');
  rec('SELF-TEST home with its hash removed: violation seen', v.length > 0 && /script-src/.test(v.join()), v.length + ' violation(s), class "' + cls + '"');
  rec('SELF-TEST home with its hash removed: head script did NOT run', /no-js/.test(cls));
  await ctx.close();
}
{
  const { ctx, page } = await open('/privacy/', 390, (h) => h.replace('</body>', '<script>window.__evil=1</script></body>'));
  const v = await page.evaluate('window.__csp'), evil = await page.evaluate('window.__evil');
  rec('SELF-TEST privacy with an extra inline script: violation seen and script blocked', v.length > 0 && evil === undefined, v.length + ' violation(s), ran=' + (evil === 1));
  await ctx.close();
}

// ---------------- every page, two widths
const jobs = []; for (const p of PAGES) for (const w of [1440, 390]) jobs.push([p, w]);
await pool(jobs, async ([path, w]) => {
  const tag = path + ' @' + w;
  const { ctx, page } = await open(path, w);
  const head = await page.evaluate(() => {
    const m = document.head.querySelectorAll('meta'); const first = m[0], second = m[1];
    const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const ref = document.querySelector('meta[name="referrer"]');
    return { order: first && first.getAttribute('charset') && second === csp, csp: csp && csp.content, ref: ref && ref.content,
      cls: document.documentElement.className, inlineScripts: [...document.scripts].filter(s => !s.src).length };
  });
  rec(tag + ' CSP meta right after charset', !!head.csp && head.order);
  rec(tag + ' policy', !!head.csp && /default-src 'self'/.test(head.csp) && /object-src 'none'/.test(head.csp) && /base-uri 'self'/.test(head.csp) && /form-action 'self'/.test(head.csp) && /connect-src 'self'/.test(head.csp) && /img-src 'self' data:/.test(head.csp) && /font-src 'self'/.test(head.csp) && !/unsafe-eval/.test(head.csp) && !/script-src[^;]*unsafe-inline/.test(head.csp));
  rec(tag + ' referrer strict-origin-when-cross-origin', head.ref === 'strict-origin-when-cross-origin');
  rec(tag + ' head script ran (no "no-js" left)', !/\bno-js\b/.test(head.cls), head.cls);
  if (['/', '/cloudchase/', '/spellshore/', '/shaftbound/'].includes(path)) {
    const on = /astro-on/.test(head.cls);
    rec(tag + ' instrument on (astro-on)', on);
    if (on) { await page.waitForTimeout(1500); const gl = await page.evaluate(() => { const c = document.querySelector('canvas'); return c ? c.width + 'x' + c.height : 'none'; }); rec(tag + ' instrument canvas sized', gl !== 'none' && !/^0x|x0$/.test(gl), gl); }
  }
  if (/^\/(legal|privacy|terms|accessibility)\/$/.test(path)) {
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 300) { scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } });
    await page.waitForTimeout(500);
    const rv = await page.evaluate(() => [document.querySelectorAll('.rv').length, document.querySelectorAll('.rv.in').length]);
    rec(tag + ' reveal text shown (none on these pages today)', rv[0] === rv[1], rv[1] + '/' + rv[0]);
    rec(tag + ' no page errors', !page.cons.some(c => /PAGEERROR/.test(c)));
    rec(tag + ' docpage.js loaded 200', page.reqs.some(r => r === '200 ' + BASE + '/astro/docpage.js'));
  }
  if (path === '/' && w === 1440) {
    // the policy's connect-src, probed directly: a same-site file is fetched, an outside address is refused
    const probe = await page.evaluate(async () => {
      const a = await fetch('/astro/stars.js', { cache: 'no-store' }).then(r => r.status, e => 'blocked ' + e);
      const n0 = window.__csp.length;
      const b = await fetch('https://example.com/x.mp3').then(r => r.status, e => 'blocked');
      await new Promise(r => setTimeout(r, 300));
      return { a, b, v: window.__csp.slice(n0) };
    });
    rec(tag + ' connect-src: a same-site file is reachable (200)', probe.a === 200, String(probe.a));
    rec(tag + ' connect-src: outside address refused by the policy', probe.b === 'blocked' && probe.v.some(x => /connect-src/.test(x)), JSON.stringify(probe.v));
    await page.evaluate(() => { window.__csp = []; });
    page.cons = page.cons.filter(c => !/example\.com/.test(c));
    // the site has no sound (King, 14 Nov): no button, nothing asks for /astro/sounds/
    rec(tag + ' no sound button', (await page.$$('[data-sound], button.snd')).length === 0);
  }
  rec(tag + ' nothing requests /astro/sounds/', !page.reqs.some(r => /\/astro\/sounds\//.test(r)));
  const v = await page.evaluate('window.__csp');
  const bad = page.cons.filter(isCspMsg);
  rec(tag + ' zero CSP violations', v.length === 0 && bad.length === 0, v.concat(bad).join(' | ').slice(0, 300));
  const ext = page.reqs.filter(r => /^EXTERNAL|^FAILED/.test(r));
  rec(tag + ' no external or failed requests', ext.length === 0, ext.join(' | ').slice(0, 300));
  page.cons.filter(c => !isCspMsg(c)).forEach(c => errs.push(c + ' @ ' + tag));
  await ctx.close();
});
console.log('other console errors/warnings: ' + errs.length); errs.forEach(e => console.log('  ' + e));
rec('no console errors or warnings on any page (the old four sound 404s are gone)', errs.length === 0, errs.length + ' found');
console.log(`csp ${engine} ${BASE}: ${pass}/${pass + fail} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
