// The constellation trail on every page at 1440 and 1024 wide (real mouse moves), plus: never on touch, off with reduce motion, frame times.
//   node trail_test.mjs <baseUrl> [shotDir]
import { createRequire } from 'node:module';
const require = createRequire('file:///C:/CC/listener-ic2/node_modules/');
const pw = require('playwright-core');
const [, , BASE = 'http://127.0.0.1:8123', SHOTS = ''] = process.argv;
const browser = await pw.chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const PAGES = ['/', '/cloudchase/', '/spellshore/', '/shaftbound/', '/cloudchase/privacy/', '/cloudchase/terms/', '/cloudchase/support/', '/cloudchase/delete-data/', '/spellshore/privacy/', '/spellshore/terms/', '/spellshore/support/', '/spellshore/delete-data/', '/spellshore/parents/', '/shaftbound/privacy/', '/shaftbound/terms/', '/shaftbound/support/', '/shaftbound/delete-data/', '/shaftbound/parents/', '/legal/', '/privacy/', '/terms/', '/accessibility/', '/404.html'];
let fails = 0, passes = 0; const errs = [];
const say = (ok, m) => { console.log((ok ? 'PASS ' : 'FAIL ') + m); ok ? passes++ : fails++; };
// how much of the trail canvas is painted, and the brightest clusters (a rough star count)
const INK = `(function(){var c=document.getElementById('trail');if(!c)return null;var x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,n=0,core=0;for(var i=3;i<d.length;i+=4){if(d[i]>8)n++;if(d[i]>170)core++;}return {ink:n,core:core,w:c.width,h:c.height};})()`;
async function sweep(page, pts, steps = 2, pause = 10) { for (const [x, y] of pts) { await page.mouse.move(x, y, { steps }); await page.waitForTimeout(pause); } }

async function onePage(w, h, path) {
  {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errs.push(path + ' ' + w + ': ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(path + ' ' + w + ': ' + m.text()); });
    await page.goto(BASE + path, { waitUntil: 'load' }); await page.waitForTimeout(path === '/' || /^\/(cloudchase|spellshore|shaftbound)\/$/.test(path) ? 2200 : 700);
    const pre = await page.evaluate(() => ({ trail: !!document.getElementById('trail'), reticle: !!document.querySelector('.reticle'), cls: document.documentElement.className }));
    // a wandering path across the open middle of the page
    const pts = []; for (let i = 0; i <= 26; i++) pts.push([Math.round(w * (0.22 + 0.56 * i / 26)), Math.round(h * (0.5 + 0.16 * Math.sin(i / 2.2)))]);
    await sweep(page, pts);
    const mid = await page.evaluate(INK);
    const st = await page.evaluate(() => { const c = document.getElementById('trail'); if (!c) return null; const cs = getComputedStyle(c); const hd = document.querySelector('header'); const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return { pe: cs.pointerEvents, z: +cs.zIndex, pos: cs.position, headerZ: hd ? +getComputedStyle(hd).zIndex : null, topIsTrail: e === c, bodyCursor: getComputedStyle(document.body).cursor, htmlCursor: getComputedStyle(document.documentElement).cursor, linkCursor: (function () { const a = document.querySelector('header a'); return a ? getComputedStyle(a).cursor : null; })() }; });
    if (SHOTS && (path === '/' || path === '/cloudchase/' || path === '/privacy/')) await page.screenshot({ path: SHOTS + '/trail_' + (path === '/' ? 'home' : path.replace(/\//g, '')) + '_' + w + '.png' });
    await page.waitForTimeout(450);
    const twk = await page.evaluate(INK);          // after the stop: still there (twinkle), fading
    // hover a header link: it gets the gold edge
    const link = page.locator('header a').first(); const lb = await link.boundingBox();
    await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2, { steps: 8 }); await page.waitForTimeout(120);
    const litOn = await page.evaluate(() => { const e = document.querySelector('.trail-lit'); return e ? e.tagName + ':' + (e.textContent || '').trim().slice(0, 20) : null; });
    await page.mouse.move(w * 0.5, h * 0.55, { steps: 8 }); await page.waitForTimeout(120);
    const litOff = await page.evaluate(() => document.querySelectorAll('.trail-lit').length);
    // a click on empty space: stardust, then everything gone
    await page.waitForTimeout(2300);
    const quiet = await page.evaluate(INK);
    await page.mouse.move(w * 0.5 + 3, h * 0.55, { steps: 1 });
    const urlBefore = page.url();
    const spot = await page.evaluate(() => { for (let y = Math.round(innerHeight * 0.3); y < innerHeight * 0.8; y += 20) for (let x = Math.round(innerWidth * 0.3); x < innerWidth * 0.7; x += 20) { const e = document.elementFromPoint(x, y); if (e && !e.closest('a,button,summary,input,.card')) return [x, y]; } return null; });
    let burst = null, after = null;
    if (spot) { await page.mouse.move(spot[0], spot[1], { steps: 2 }); await page.mouse.click(spot[0], spot[1]); await page.waitForTimeout(90); burst = await page.evaluate(INK); await page.waitForTimeout(2600); after = await page.evaluate(INK); }
    const ok = !pre.reticle && !pre.trail && mid && mid.ink > 150 && st.pe === 'none' && st.pos === 'fixed' && st.z === 9 && (st.headerZ == null || st.headerZ > st.z) && !st.topIsTrail && st.bodyCursor === 'auto' && st.htmlCursor === 'auto' && st.linkCursor === 'pointer' && !!litOn && litOff === 0 && quiet && quiet.ink === 0 && burst && burst.ink > 20 && after && after.ink === 0 && page.url() === urlBefore;
    say(ok, w + ' ' + path + ': trail draws (ink ' + (mid && mid.ink) + ', bright cores ' + (mid && mid.core) + '), fades to nothing (' + (quiet && quiet.ink) + '), click burst ' + (burst && burst.ink) + ' -> ' + (after && after.ink) + '; canvas pointer-events ' + (st && st.pe) + ', z ' + (st && st.z) + ' under header z ' + (st && st.headerZ) + '; cursor body ' + (st && st.bodyCursor) + ' / link ' + (st && st.linkCursor) + '; no reticle; hover lights "' + litOn + '" and lets go (' + litOff + ')');
    await ctx.close();
  }
}
{
  const jobs = []; for (const [w, h] of [[1440, 900], [1024, 768]]) for (const path of PAGES) jobs.push([w, h, path]);
  let next = 0; const worker = async () => { while (next < jobs.length) { const j = jobs[next++]; try { await onePage(j[0], j[1], j[2]); } catch (e) { say(false, j[0] + ' ' + j[2] + ': test error ' + String(e.message).split('\n')[0].slice(0, 160)); } } };
  await Promise.all([worker(), worker(), worker(), worker(), worker()]);
}

// at most 8 stars: a very long fast path, then count the bright cores on the canvas
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage(); await page.goto(BASE + '/privacy/'); await page.waitForTimeout(600);
  let maxBlobs = 0;
  for (let lap = 0; lap < 2; lap++) {
    const pts = []; for (let i = 0; i <= 16; i++) pts.push([200 + i * 60, 300 + (i % 2) * 200 + lap * 30]);
    for (const p of pts) {
      await page.mouse.move(p[0], p[1], { steps: 2 });
      const n = await page.evaluate(() => { const c = document.getElementById('trail'); if (!c) return 0; const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data; const seen = new Uint8Array(W * H); let blobs = 0; const st = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (seen[i] || d[i * 4 + 3] < 120) continue; blobs++; st.push(i); seen[i] = 1; while (st.length) { const j = st.pop(), jx = j % W, jy = (j / W) | 0; for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = jx + ax, ny = jy + ay; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (!seen[k] && d[k * 4 + 3] >= 120) { seen[k] = 1; st.push(k); } } } } return blobs; });
      if (n > maxBlobs) maxBlobs = n;
    }
  }
  say(maxBlobs >= 3 && maxBlobs <= 8, 'never more than 8 stars: the most bright stars seen at once over two fast laps was ' + maxBlobs);
  await ctx.close();
}

// never on a touch screen, and off with reduce motion
{
  const ctx = await browser.newContext({ ...pw.devices['iPhone 13'] }); const page = await ctx.newPage();
  await page.goto(BASE + '/'); await page.waitForTimeout(2200);
  for (let i = 0; i < 12; i++) await page.touchscreen.tap(60 + i * 24, 200 + (i % 3) * 30);
  await page.waitForTimeout(300);
  say(!(await page.evaluate("!!document.getElementById('trail')")) && (await page.evaluate("document.querySelectorAll('.trail-lit,.reticle').length")) === 0, 'touch screen (iPhone 13): after 12 taps there is no trail canvas, no glow, no reticle');
  await ctx.close();
  const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const p2 = await c2.newPage();
  await p2.goto(BASE + '/'); await p2.waitForTimeout(1500);
  await sweep(p2, [[300, 300], [500, 400], [800, 350], [1000, 500], [700, 600]]);
  say(!(await p2.evaluate("!!document.getElementById('trail')")) && (await p2.evaluate("document.querySelectorAll('.trail-lit,.reticle').length")) === 0, 'reduce motion on: mouse moves create no trail canvas and no glow');
  await c2.close();
}

// frame times: the same page with the mouse still and with the mouse drawing the trail the whole time
for (const path of ['/privacy/', '/']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }); const page = await ctx.newPage();
  await page.goto(BASE + path); await page.waitForTimeout(2500);
  const sample = () => page.evaluate(() => new Promise((res) => { const t = []; let l = performance.now(), t0 = l; function f(n) { t.push(n - l); l = n; if (n - t0 < 3000) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ n: t.length, med: t[t.length >> 1], p95: t[Math.floor(t.length * 0.95)], fps: Math.round(t.length / 3) }); } } requestAnimationFrame(f); }));
  const idle = await sample();
  const mover = (async () => { const t0 = Date.now(); let i = 0; while (Date.now() - t0 < 3100) { i++; await page.mouse.move(720 + 420 * Math.cos(i / 7), 450 + 260 * Math.sin(i / 5), { steps: 2 }); } })();
  const busy = await sample(); await mover;
  const ok = busy.med <= idle.med + 1.5 && busy.fps >= idle.fps * 0.9;
  say(ok, 'frame time ' + path + ' (1440x900, headless): mouse still ' + idle.fps + ' fps (median ' + idle.med.toFixed(1) + ' ms, 95th ' + idle.p95.toFixed(1) + '); drawing the trail ' + busy.fps + ' fps (median ' + busy.med.toFixed(1) + ' ms, 95th ' + busy.p95.toFixed(1) + ')');
  await ctx.close();
}
await browser.close();
console.log('\ntrail: ' + passes + ' passed, ' + fails + ' failed; page errors ' + errs.length); errs.slice(0, 8).forEach((e) => console.log('  ' + e));
