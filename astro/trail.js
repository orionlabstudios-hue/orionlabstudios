/* Orion Lab Studios - THE CONSTELLATION TRAIL (computers only).
   Plain JavaScript, no libraries, no cookies, no network calls. The system cursor is never hidden or replaced.
   - As the mouse moves it drops a tiny warm-white star every 60-90 px of travel, joined to the one before by a thin
     faint line, so the visitor draws a small constellation. At most 8 stars; each fades in under two seconds, drifting a little.
   - When the mouse stops, the newest star twinkles once.
   - Over anything that can be clicked (a link, a button, a tab, a ring that is live) the newest stars drift toward it
     and its edge gets a soft gold glow (the .trail-lit class in astro.css; a ring is glowed on the canvas).
   - A click throws a few specks of stardust that are gone in about half a second.
   It is one canvas with pointer-events:none, above the page and below the header: it can never take a click or a tap.
   Never on touch screens (only real mouse events count), and off entirely when "reduce motion" is on.
   It draws only while something is alive, and clears only the part of the canvas it used. */
(function () {
  'use strict';
  var win = window, doc = document;
  if (!win.matchMedia || !win.requestAnimationFrame) return;
  var fine = win.matchMedia('(hover: hover) and (pointer: fine)'), red = win.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || red.matches) return;

  var MAX = 8, LIFE = 1.8, CLICKABLE = 'a[href],button,summary,[data-tab],[role="button"],input,select,textarea,label[for]';
  var cv = null, ctx = null, W = 0, H = 0, dpr = 1, sprite = null, off = false;
  var stars = [], specks = [], running = false, last = 0;
  var px = 0, py = 0, lastX = 0, lastY = 0, havePtr = false, travel = 0, gap = 75, lastMove = 0, twinkled = true, target = null;
  var lit = null, ring = null, ringShow = null, ringGlow = 0;
  var dirty = null;   // the box drawn into last frame: [x0, y0, x1, y1]

  function mkSprite() {
    var s = doc.createElement('canvas'); s.width = s.height = 64;
    var c = s.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,250,236,1)'); g.addColorStop(0.16, 'rgba(255,244,222,0.85)');
    g.addColorStop(0.42, 'rgba(255,226,180,0.22)'); g.addColorStop(1, 'rgba(255,214,150,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    return s;
  }
  function size() {
    if (!cv) return;
    W = win.innerWidth; H = win.innerHeight; dpr = Math.min(win.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dirty = null;
  }
  function setup() {
    cv = doc.createElement('canvas'); cv.id = 'trail'; cv.setAttribute('aria-hidden', 'true');
    ctx = cv.getContext('2d'); if (!ctx) { off = true; return; }
    doc.body.appendChild(cv); sprite = mkSprite(); size();
    win.addEventListener('resize', size, { passive: true });
  }
  function start() { if (!running && !off && !doc.hidden) { running = true; last = performance.now(); win.requestAnimationFrame(frame); } }
  function alpha(s, now) { var u = (now - s.t) / (LIFE * 1000); return u >= 1 ? 0 : Math.pow(1 - u, 1.5); }
  function mark(x, y, r) {
    if (!dirty) dirty = [x - r, y - r, x + r, y + r];
    else { if (x - r < dirty[0]) dirty[0] = x - r; if (y - r < dirty[1]) dirty[1] = y - r; if (x + r > dirty[2]) dirty[2] = x + r; if (y + r > dirty[3]) dirty[3] = y + r; }
  }
  function drop(x, y, now) {
    var prev = stars.length ? stars[stars.length - 1] : null;
    stars.push({ x: x, y: y, t: now, s: 1.0 + Math.random() * 1.2, b: 0.6 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 9, vy: (Math.random() - 0.5) * 9 - 1.5, prev: prev, tw: -1 });
    if (stars.length > MAX) {   // the oldest one goes out quickly (never a pop)
      var o = stars[stars.length - MAX - 1], soon = now - (LIFE - 0.22) * 1000; if (o.t > soon) o.t = soon;
    }
  }
  function setLit(el) {
    if (el === lit) return;
    if (lit) lit.classList.remove('trail-lit');
    lit = el; if (lit) lit.classList.add('trail-lit');
  }
  function clearAll() {
    stars = []; specks = []; ring = null; ringShow = null; ringGlow = 0; setLit(null); havePtr = false;
    if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); } dirty = null;
  }

  function frame(now) {
    if (off || doc.hidden) { running = false; return; }
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    if (dirty) { ctx.clearRect(dirty[0] - 2, dirty[1] - 2, dirty[2] - dirty[0] + 4, dirty[3] - dirty[1] + 4); dirty = null; }
    // the mouse has stopped: the newest star twinkles, once
    if (!twinkled && now - lastMove > 150) { twinkled = true; if (stars.length) stars[stars.length - 1].tw = now; }
    // what the newest stars lean toward: the control under the mouse, or a live ring
    if (win.AstroHot && havePtr) ring = win.AstroHot(px, py, target);
    var pull = null;
    if (lit) { var r = lit.getBoundingClientRect(); if (r.width > 0) pull = r; }
    if (ring) ringShow = ring;
    ringGlow += ((ring ? 1 : 0) - ringGlow) * (1 - Math.exp(-dt * (ring ? 9 : 5)));
    var i, s, a, alive = [];
    for (i = 0; i < stars.length; i++) { s = stars[i]; s.a = alpha(s, now); if (s.a > 0.004) alive.push(s); }
    stars = alive;
    for (i = 0; i < stars.length; i++) {
      s = stars[i]; s.x += s.vx * dt; s.y += s.vy * dt;
      if (i >= stars.length - 3 && (pull || ring)) {
        var tx, ty;
        if (pull) { tx = Math.min(pull.right, Math.max(pull.left, s.x)); ty = Math.min(pull.bottom, Math.max(pull.top, s.y)); }
        else { var dx = s.x - ring.x, dy = s.y - ring.y, d = Math.sqrt(dx * dx + dy * dy) || 1; tx = ring.x + dx / d * ring.r; ty = ring.y + dy / d * ring.r; }
        var k = 1 - Math.exp(-dt * 2.6); s.x += (tx - s.x) * k; s.y += (ty - s.y) * k;
      }
    }
    // the lines first, then the stars on top
    ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    for (i = 0; i < stars.length; i++) {
      s = stars[i]; var p = s.prev;
      if (!p || !(p.a > 0.004)) { s.prev = null; continue; }
      a = Math.min(s.a, p.a) * 0.34;
      ctx.strokeStyle = 'rgba(255,236,204,' + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(s.x, s.y); ctx.stroke();
      mark(p.x, p.y, 3); mark(s.x, s.y, 3);
    }
    for (i = 0; i < stars.length; i++) {
      s = stars[i]; var tw = 0;
      if (s.tw > 0) { var u = (now - s.tw) / 700; tw = u < 1 ? Math.sin(Math.PI * u) : 0; }
      var rad = s.s * 5.5 * (1 + 0.8 * tw);
      ctx.globalAlpha = Math.min(1, s.a * s.b * (1 + 0.5 * tw));
      ctx.drawImage(sprite, s.x - rad, s.y - rad, rad * 2, rad * 2);
      if (tw > 0.02) {   // the twinkle: four short rays
        var len = 4 + 7 * tw; ctx.globalAlpha = Math.min(1, s.a * 0.75 * tw); ctx.strokeStyle = 'rgb(255,246,226)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y); ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len); ctx.stroke(); ctx.lineWidth = 0.7;
        mark(s.x, s.y, len + 2);
      }
      mark(s.x, s.y, rad + 1);
    }
    ctx.globalAlpha = 1;
    // stardust from a click
    if (specks.length) {
      var keep = [];
      for (i = 0; i < specks.length; i++) {
        var q = specks[i], v = (now - q.t) / q.life; if (v >= 1) continue;
        q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 1 - dt * 2.4; q.vy = q.vy * (1 - dt * 2.4) + 30 * dt;
        ctx.globalAlpha = (1 - v) * (1 - v) * q.b;
        ctx.drawImage(sprite, q.x - q.s, q.y - q.s, q.s * 2, q.s * 2);
        mark(q.x, q.y, q.s + 1); keep.push(q);
      }
      specks = keep; ctx.globalAlpha = 1;
    }
    // a live ring under the mouse: a soft gold edge, like any other control
    if (ringShow && ringGlow > 0.01) {
      ctx.save(); ctx.strokeStyle = 'rgba(255,214,150,' + (0.6 * ringGlow).toFixed(3) + ')'; ctx.lineWidth = 1.2;
      ctx.shadowColor = 'rgba(255,200,120,0.75)'; ctx.shadowBlur = 14 * ringGlow;
      ctx.beginPath(); ctx.arc(ringShow.x, ringShow.y, ringShow.r + 4, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      mark(ringShow.x, ringShow.y, ringShow.r + 24);
    } else if (!ring) ringShow = null;
    if (stars.length || specks.length || ringShow || !twinkled) win.requestAnimationFrame(frame);
    else { running = false; if (dirty) { ctx.clearRect(dirty[0] - 2, dirty[1] - 2, dirty[2] - dirty[0] + 4, dirty[3] - dirty[1] + 4); dirty = null; } }
  }

  doc.addEventListener('pointermove', function (e) {
    if (off || (e.pointerType && e.pointerType !== 'mouse')) return;   // a finger or a pen is not the mouse
    if (!cv) { setup(); if (off) return; }
    var now = performance.now(), x = e.clientX, y = e.clientY;
    if (!havePtr) { havePtr = true; lastX = x; lastY = y; travel = 0; }
    var dx = x - lastX, dy = y - lastY, d = Math.sqrt(dx * dx + dy * dy);
    lastX = x; lastY = y; px = x; py = y; target = e.target; lastMove = now; twinkled = false;
    if (d > 400) { travel = 0; return; }   // the mouse came back in somewhere else: no line across the screen
    travel += d;
    if (travel >= gap) { travel = 0; gap = 60 + Math.random() * 30; drop(x, y, now); }
    start();
  }, { passive: true });
  doc.addEventListener('pointerover', function (e) {
    if (off || (e.pointerType && e.pointerType !== 'mouse')) return;
    var el = e.target && e.target.closest ? e.target.closest(CLICKABLE) : null;
    if (el && (el.disabled || el.hidden)) el = null;
    setLit(el); target = e.target;
  }, { passive: true });
  doc.documentElement.addEventListener('mouseleave', function () { setLit(null); havePtr = false; ring = null; }, { passive: true });
  doc.addEventListener('click', function (e) {
    if (off || !cv || !havePtr || e.detail === 0 || (e.pointerType && e.pointerType !== 'mouse')) return;
    var now = performance.now(), n = 6 + Math.floor(Math.random() * 5);
    for (var i = 0; i < n; i++) {
      var ang = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
      specks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: now, life: 420 + Math.random() * 180, s: 1.6 + Math.random() * 2.2, b: 0.7 + Math.random() * 0.3 });
    }
    start();
  }, { passive: true });
  // a touch on a screen that also has a mouse: put everything away
  doc.addEventListener('touchstart', function () { if (cv) clearAll(); }, { passive: true });
  doc.addEventListener('visibilitychange', function () { if (doc.hidden && cv) clearAll(); });
  win.addEventListener('pagehide', function () { setLit(null); });
  function onReduce() { if (red.matches) { off = true; if (cv) clearAll(); } }
  if (red.addEventListener) red.addEventListener('change', onReduce); else if (red.addListener) red.addListener(onReduce);
})();
