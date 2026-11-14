/* Orion Lab Studios - the background stars (the mouse-follow stars from the old home page).
   Plain JavaScript, no libraries, no cookies, no network calls.
   - On a computer they lean toward the mouse; on a phone they drift slowly by themselves (no motion permission).
   - Fast scrolling streaks them (AstroSky.kick(velocity) is called by astro.js; on other pages the scroll itself does it).
   - With "reduce motion" on they are drawn once and stay still.
   Tint: <body data-sky="cc|ss|sb"> picks the page's colour; anything else is the studio's. */
(function () {
  'use strict';
  var win = window, doc = document;
  var cv = doc.getElementById('sky');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  function mq(q) { return !!(win.matchMedia && win.matchMedia(q).matches); }
  var reduce = mq('(prefers-reduced-motion: reduce)'), coarse = mq('(pointer: coarse)');
  var TINTS = {
    studio: ['255,214,170', '190,205,255', '255,248,235'],
    cc: ['190,228,255', '255,226,200', '240,248,255'],
    ss: ['150,255,226', '255,224,150', '235,255,250'],
    sb: ['255,200,130', '255,236,190', '255,244,228']
  };
  var key = (doc.body && doc.body.getAttribute('data-sky')) || 'studio';
  var tint = TINTS[key] || TINTS.studio;
  var stars = [], SW = 0, SH = 0, SHv = 0, dpr = 1, mx = 0, my = 0, tx = 0, ty = 0, usedMouse = false, seed = 7, t0 = performance.now();
  var vel = 0, lastY = 0, external = false, running = true;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function scrollY() { return win.pageYOffset || doc.documentElement.scrollTop || 0; }
  function size(force) {
    var w = win.innerWidth, h = win.innerHeight;
    if (!force && w === SW && Math.abs(h - SHv) < h * 0.25) return;   // a phone's address bar sliding is not a resize
    SW = w; SHv = h; SH = Math.round(h * 1.15);
    dpr = Math.min(win.devicePixelRatio || 1, coarse ? 1.5 : 2);
    cv.width = Math.round(SW * dpr); cv.height = Math.round(SH * dpr);
    cv.style.width = SW + 'px'; cv.style.height = SH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = []; seed = 7;
    var n = Math.round(SW * SHv / (coarse ? 3000 : 2400));
    for (var i = 0; i < n; i++) {
      var z = rnd();
      stars.push({ x: rnd() * SW, y: rnd() * SH, z: z, r: 0.25 + z * z * 1.5, p: rnd() * 6.28, s: 0.4 + rnd() * 1.6,
        h: rnd() < 0.12 ? tint[0] : (rnd() < 0.18 ? tint[1] : tint[2]) });
    }
    if (reduce) draw(t0);
  }
  function draw(now) {
    var t = (now - t0) / 1000;
    var gx = mx, gy = my;
    if (!usedMouse && !reduce) { gx = 0.5 * Math.sin(t * 0.09); gy = 0.5 * Math.cos(t * 0.063); }
    tx += (gx - tx) * 0.04; ty += (gy - ty) * 0.04;
    var sy = scrollY();
    if (!external) { var d = sy - lastY; lastY = sy; vel += (d - vel) * 0.25; }
    var streak = reduce ? 0 : Math.max(-140, Math.min(140, vel * 1.6));
    var sl = Math.abs(streak) > 2.5;
    ctx.clearRect(0, 0, SW, SH);
    ctx.lineCap = 'round';
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
      if (reduce) a = 0.75;
      var px = s.x + tx * s.z * 26;
      var py = s.y + ty * s.z * 18 - (reduce ? 0 : t * s.z * 3) - sy * s.z * 0.1;
      py = ((py % SH) + SH) % SH;
      var al = a * (0.35 + 0.65 * s.z);
      if (sl) {
        ctx.strokeStyle = 'rgba(' + s.h + ',' + (al * 0.85).toFixed(3) + ')';
        ctx.lineWidth = Math.max(0.6, s.r * 1.4);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + streak * s.z); ctx.stroke();
        continue;
      }
      ctx.beginPath(); ctx.fillStyle = 'rgba(' + s.h + ',' + al.toFixed(3) + ')'; ctx.arc(px, py, s.r, 0, 6.283); ctx.fill();
      if (s.r > 1.35) { ctx.fillStyle = 'rgba(' + s.h + ',' + (a * 0.08).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(px, py, s.r * 4, 0, 6.283); ctx.fill(); }
    }
    if (external) vel *= 0.9;
  }
  function loop(now) { if (!running) return; draw(now); win.requestAnimationFrame(loop); }
  size(true);
  win.addEventListener('resize', function () { size(false); }, { passive: true });
  win.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;   // a finger scrolling is not the mouse
    usedMouse = true; mx = e.clientX / SW - 0.5; my = e.clientY / SHv - 0.5;
  }, { passive: true });
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) running = false; else if (!running && !reduce) { running = true; win.requestAnimationFrame(loop); }
  });
  lastY = scrollY();
  if (!reduce) win.requestAnimationFrame(loop); else draw(t0);
  // astro.js drives the streaks from its own smoothed scroll speed (px per frame), so both move together
  win.AstroSky = { kick: function (v) { external = true; vel = v; }, redraw: function () { draw(performance.now()); } };
})();
