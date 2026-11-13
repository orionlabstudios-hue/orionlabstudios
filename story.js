/* Orion Lab Studios - the scroll story.
   Plain JavaScript. No libraries, no cookies, no network calls, nothing is stored.
   One animation loop drives: the mouse-follow stars, the pinned Orion intro, the big statements,
   the full-screen game panels, the game-page scene and the reveal on scroll.
   Motion uses transform and opacity only, so it stays smooth on phones.
   With "reduce motion" on, none of the scroll animation runs: the final picture is shown as it is. */
(function () {
  'use strict';
  var win = window, doc = document, root = doc.documentElement;
  function mq(q) { return !!(win.matchMedia && win.matchMedia(q).matches); }
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var coarse = mq('(pointer: coarse)');
  root.classList.add('story-js');
  if (reduce) root.classList.add('rm');

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeIO(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function easeOut(x) { x = clamp(x, 0, 1); return 1 - (1 - x) * (1 - x) * (1 - x); }
  function qs(s, r) { return (r || doc).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function absTop(el) { var t = 0; while (el) { t += el.offsetTop; el = el.offsetParent; } return t; }
  function scrollY() { return win.pageYOffset || root.scrollTop || 0; }

  /* ============================================================ the stars (mouse-follow; they drift on their own on phones) */
  var sky = doc.getElementById('sky');
  var sctx = sky ? sky.getContext('2d') : null;
  var stars = [], SW = 0, SH = 0, SHv = 0, sdpr = 1, mx = 0, my = 0, tx = 0, ty = 0, usedMouse = false, seed = 7, t0 = performance.now();
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function sizeSky(force) {
    if (!sky) return;
    var w = win.innerWidth, h = win.innerHeight;
    if (!force && w === SW && Math.abs(h - SHv) < h * 0.25) return;   // the phone's address bar sliding is not a resize
    SW = w; SHv = h; SH = Math.round(h * 1.15);
    sdpr = Math.min(win.devicePixelRatio || 1, coarse ? 1.5 : 2);
    sky.width = Math.round(SW * sdpr); sky.height = Math.round(SH * sdpr);
    sky.style.width = SW + 'px'; sky.style.height = SH + 'px';
    sctx.setTransform(sdpr, 0, 0, sdpr, 0, 0);
    stars = []; seed = 7;
    var n = Math.round(SW * SHv / 2600);
    for (var i = 0; i < n; i++) {
      var z = rnd();
      stars.push({ x: rnd() * SW, y: rnd() * SH, z: z, r: 0.25 + z * z * 1.5, p: rnd() * 6.28, s: 0.4 + rnd() * 1.6,
        h: rnd() < 0.12 ? '255,214,170' : (rnd() < 0.18 ? '190,205,255' : '255,248,235') });
    }
  }
  function drawSky(now) {
    var t = (now - t0) / 1000;
    var gx = mx, gy = my;
    if (!usedMouse && !reduce) { gx = 0.5 * Math.sin(t * 0.09); gy = 0.5 * Math.cos(t * 0.063); }   // a slow drift of its own, no permission needed
    tx += (gx - tx) * 0.04; ty += (gy - ty) * 0.04;
    var sy = scrollY();
    sctx.clearRect(0, 0, SW, SH);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
      var px = s.x + tx * s.z * 26;
      var py = s.y + ty * s.z * 18 - (reduce ? 0 : t * s.z * 3) - sy * s.z * 0.1;
      py = ((py % SH) + SH) % SH;
      sctx.beginPath(); sctx.fillStyle = 'rgba(' + s.h + ',' + (a * (0.35 + 0.65 * s.z)).toFixed(3) + ')'; sctx.arc(px, py, s.r, 0, 6.283); sctx.fill();
      if (s.r > 1.35) { sctx.fillStyle = 'rgba(' + s.h + ',' + (a * 0.08).toFixed(3) + ')'; sctx.beginPath(); sctx.arc(px, py, s.r * 4, 0, 6.283); sctx.fill(); }
    }
  }
  if (sky) {
    sizeSky(true);
    win.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;   // a finger scrolling is not the mouse
      usedMouse = true; mx = e.clientX / SW - 0.5; my = e.clientY / SHv - 0.5;
    }, { passive: true });
  }

  /* ============================================================ the Orion intro (the same look and order as our app's intro) */
  // Pep's reference numbers, in the app's own 1080 x 1920 pixels (y down). Time t is the app's clock, 0 to 4.4 s.
  var DUR = 4.4, EIGHTH = 60 / 140 / 2, FLY0 = 1.8, FLY1 = 2.1, DRAW0 = 2.12, DRAW1 = 2.95, PULSE = 60 / 140 * 7, WORD0 = PULSE + 0.2, SWEEP0 = PULSE + 0.03, SWEEPLEN = 0.49;
  var RA = [355.2, 325.1, 332.0, 336.2, 340.8, 347.8, 314.5], DEC = [7.41, 6.35, -0.30, -1.20, -1.94, -9.67, -8.20];   // Betelgeuse, Bellatrix, Mintaka, Alnilam, Alnitak, Saiph, Rigel
  var SIZE = [1.35, 1, 1.05, 1.1, 1.05, 0.95, 1.43], CORESC = [1, 1.15, 1.1, 1.1, 1.1, 1, 1.35];
  var COL = [[255, 184, 122], [217, 235, 255], [204, 242, 255], [204, 242, 255], [204, 242, 255], [217, 235, 255], [153, 230, 255]];
  var CORE = [[255, 255, 255], [255, 255, 255], [191, 255, 255], [191, 255, 255], [191, 255, 255], [255, 255, 255], [217, 247, 255]];
  var FLYCOL = [97, 247, 255], TEAL = '89,242,217', GLOWWHITE = '158,230,255', BLOOMCYAN = '122,227,255';
  var PAIRS = [[0, 1], [0, 4], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6]], BELT = [-1, -1, 2, 1, 0, -1, -1];
  var CY = 1210, R = 118, GS = 1.25;
  var STX = [], STY = [];
  for (var k = 0; k < 7; k++) { STX[k] = 540 - (RA[k] - 335) * 0.25 * 44; STY[k] = 560 - DEC[k] * 44; }
  function lightAt(k) { return EIGHTH * (k + 2); }
  function letterAt(i, t) { return easeIO((t - DRAW0 - 0.05 * i) / (DRAW1 - DRAW0 - 0.10)); }

  function arc(cx, cy, r, a0, a1, n, out) {
    for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * i / (n - 1); out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return out;
  }
  function buildPaths() {
    var o = arc(300, CY, R, -0.13, -2 * Math.PI + 0.13, 160, []);
    var l = [[490, CY - R], [490, CY + R], [628, CY + R]];
    var r2 = R / 2, s = [[905, CY - R]];
    arc(770, CY - r2, r2, -Math.PI / 2, -3 * Math.PI / 2, 60, s);
    arc(845, CY + r2, r2, -Math.PI / 2, Math.PI / 2, 60, s);
    s.push([705, CY + R]);
    return [o, l, s].map(function (pts) {
      var cum = [0];
      for (var i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { p: pts, c: cum, len: cum[cum.length - 1] };
    });
  }
  function partial(path, f, p2d) {
    var target = path.len * clamp(f, 0, 1), pts = path.p, cum = path.c, i = 1;
    p2d.moveTo(pts[0][0], pts[0][1]);
    while (i < pts.length && cum[i] <= target) { p2d.lineTo(pts[i][0], pts[i][1]); i++; }
    var tip = pts[Math.min(i, pts.length) - 1];
    if (i < pts.length) {
      var u = (target - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      tip = [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u];
      p2d.lineTo(tip[0], tip[1]);
    }
    return tip;
  }
  function sprite(rgb, kind) {
    var n = 128, c = doc.createElement('canvas'); c.width = c.height = n;
    var g = c.getContext('2d'), gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2), col = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',';
    if (kind === 'halo') { gr.addColorStop(0, col + '.9)'); gr.addColorStop(0.22, col + '.9)'); gr.addColorStop(1, col + '0)'); }
    else if (kind === 'core') { gr.addColorStop(0, col + '1)'); gr.addColorStop(0.22, col + '0)'); gr.addColorStop(1, col + '0)'); }
    else { gr.addColorStop(0, col + '1)'); gr.addColorStop(0.35, col + '.32)'); gr.addColorStop(1, col + '0)'); }
    g.fillStyle = gr; g.fillRect(0, 0, n, n);
    return c;
  }

  var intro = null;
  function initIntro() {
    var sec = qs('[data-intro]');
    if (!sec) return;
    var stage = qs('.stage', sec), cv = qs('canvas.ic', sec), ctx = cv.getContext('2d');
    var word = qs('.ols-word', sec), lines = qsa('.ols-word i', sec), caps = qsa('.ols-cap p', sec);
    var paths = buildPaths();
    var spr = [], i;
    for (i = 0; i < 7; i++) spr.push({ halo: sprite(COL[i], 'halo'), core: sprite(CORE[i], 'core'), bloom: sprite(i === 0 ? [255, 237, 168] : [153, 237, 255], 'bloom') });
    var flySpr = { halo: sprite(FLYCOL, 'halo'), core: sprite([191, 255, 255], 'core'), bloom: sprite([153, 237, 255], 'bloom') };
    var tealDot = sprite([89, 242, 217], 'halo');
    var cw = 0, ch = 0, dpr = 1, u = 0.4, oy = 0, top = 0, track = 0, vh = 0, lastWf = -1, lastCap = [];

    function layout() {
      cw = stage.clientWidth; ch = stage.clientHeight; vh = ch;
      dpr = Math.min(win.devicePixelRatio || 1, 2);
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
      var bandTop = 84, bandBot = ch - 14;                                    // under the header bar
      u = Math.min(cw * 0.98 / 960, (bandBot - bandTop) / 1310);              // the composition (x 60-1020, y 190-1500 of the 1080 x 1920 reference) fits the screen
      oy = bandTop + ((bandBot - bandTop) - 1310 * u) / 2;                    // and sits in the middle of what is left below the bar
      stage.style.setProperty('--u', u.toFixed(4));
      word.style.top = (oy + (1451 - 190) * u) + 'px';                        // the reference's wordmark line
      top = absTop(sec); track = sec.offsetHeight; lastWf = -1;
    }
    function render(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      var s = dpr * u;
      ctx.setTransform(s, 0, 0, s, dpr * (cw / 2 - 540 * u), dpr * (oy - 190 * u));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      var dim = 1 - 0.7 * easeIO((t - 2.0) / 1.2);
      var pulse = Math.exp(-Math.pow((t - PULSE - 0.03) / 0.16, 2));
      var j, k, f;

      // the constellation's lines: each is drawn out as its second star lights; the belt's leave with the belt stars
      ctx.lineWidth = Math.max(3, 1.3 / u);
      for (j = 0; j < 7; j++) {
        var a = PAIRS[j][0], b = PAIRS[j][1], la = Math.max(lightAt(a), lightAt(b));
        f = easeOut((t - la) / 0.18);
        var belt = BELT[a] >= 0 && BELT[b] >= 0, touches = BELT[a] >= 0 || BELT[b] >= 0;
        if (f <= 0 || (belt && t > FLY0)) continue;
        if (touches && t > FLY0) f *= 1 - clamp((t - FLY0) / 0.2, 0, 1);
        var p = lightAt(a) <= lightAt(b) ? a : b, q = p === a ? b : a;
        ctx.strokeStyle = 'rgba(' + TEAL + ',' + (0.6 * dim * Math.min(f * 3, 1)).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(STX[p], STY[p]); ctx.lineTo(STX[p] + (STX[q] - STX[p]) * f, STY[p] + (STY[q] - STY[p]) * f); ctx.stroke();
      }

      // the letters O, L, S, drawn by the three belt stars: a tight glow, the white neon core, and the bloom on the completion
      var sweeping = t > SWEEP0 && t < SWEEP0 + SWEEPLEN, sweepX = sweeping ? 140 + (t - SWEEP0) / SWEEPLEN * 860 : 0;
      var bloomEnv = t < PULSE ? 0 : t < PULSE + 0.04 ? (t - PULSE) / 0.04 : t < PULSE + 0.06 ? 1 : Math.pow(clamp(1 - (t - PULSE - 0.06) / 0.44, 0, 1), 1.6);
      var tips = [null, null, null], li;
      for (li = 0; li < 3; li++) {
        f = letterAt(li, t);
        if (f <= 0) continue;
        var p2d = new Path2D();
        tips[li] = partial(paths[li], f, p2d);
        ctx.globalCompositeOperation = 'lighter';
        var gain = 0.9 + 0.4 * pulse, w = 22;
        if (bloomEnv > 0.001) {
          var bw = [w + 92, w + 72, w + 52, w + 34, w + 18], ba = [0.05, 0.07, 0.11, 0.17, 0.26];
          for (j = 0; j < 5; j++) { ctx.lineWidth = bw[j]; ctx.strokeStyle = 'rgba(' + BLOOMCYAN + ',' + (ba[j] * bloomEnv).toFixed(3) + ')'; ctx.stroke(p2d); }
        }
        var gw = [w + 40, w + 28, w + 18, w + 9], ga = [0.05, 0.08, 0.12, 0.2];
        for (j = 0; j < 4; j++) { ctx.lineWidth = gw[j]; ctx.strokeStyle = 'rgba(' + GLOWWHITE + ',' + Math.min(1, ga[j] * gain).toFixed(3) + ')'; ctx.stroke(p2d); }
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = w; ctx.strokeStyle = '#ffffff'; ctx.stroke(p2d);
        if (sweeping) {                                                   // the light sweep over the letters on the completion
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(sweepX + 41 - 60, 1040); ctx.lineTo(sweepX + 41 + 60, 1040); ctx.lineTo(sweepX - 41 + 60, 1380); ctx.lineTo(sweepX - 41 - 60, 1380); ctx.closePath(); ctx.clip();
          ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = w; ctx.strokeStyle = 'rgba(255,255,255,.47)'; ctx.stroke(p2d);
          ctx.restore();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      // Orion's seven stars
      var glowGain = 0.9 + 1.6 * pulse;
      for (k = 0; k < 7; k++) {
        var on = clamp((t - lightAt(k)) / 0.06, 0, 1), x = STX[k], y = STY[k], size, alpha, spikes = true, fly = false, sp = spr[k];
        var lt = BELT[k];
        if (on <= 0) { size = 3.2 * SIZE[k]; alpha = 0.18; spikes = false; }
        else {
          var flare = 1 + 1.4 * Math.exp(-(t - lightAt(k)) * 10);
          alpha = on;
          if (lt >= 0) {
            if (t > FLY0) {
              fly = true; sp = flySpr;
              var uu = easeIO((t - FLY0) / (FLY1 - FLY0));
              var tox, toy;
              if (lt === 0) { tox = 300 + R * Math.cos(-0.13); toy = CY + R * Math.sin(-0.13); } else if (lt === 1) { tox = 490; toy = CY - R; } else { tox = 905; toy = CY - R; }
              if (uu < 1) {
                x = STX[k] + (tox - STX[k]) * uu; y = STY[k] + (toy - STY[k]) * uu - Math.sin(uu * Math.PI) * 60;
                for (j = 0; j < 10; j++) {                                  // the trail behind the flying star
                  var u2 = Math.max(uu - j * 0.035, 0), rr = 8 * (1 - j / 12);
                  var tx2 = STX[k] + (tox - STX[k]) * u2, ty2 = STY[k] + (toy - STY[k]) * u2 - Math.sin(u2 * Math.PI) * 60;
                  ctx.globalAlpha = 0.45 * (1 - j / 10); ctx.drawImage(tealDot, tx2 - rr * 2, ty2 - rr * 2, rr * 4, rr * 4);
                }
                ctx.globalAlpha = 1;
              } else {
                if (letterAt(lt, t) >= 1) continue;                         // the letter is finished: its pen star is done
                var tip = tips[lt]; if (tip) { x = tip[0]; y = tip[1]; } else { x = tox; y = toy; }
              }
            } else flare *= 1 + 0.5 * Math.exp(-Math.pow((t - 1.74) / 0.05, 2));   // the belt glints before take-off
          } else alpha = on * (0.35 + 0.65 * dim);
          size = 7.5 * SIZE[k] * flare;
        }
        var rg = size * 3.7 * GS * (fly ? 0.88 : 1), br = rg * 0.8 + 8;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = clamp(0.55 * glowGain * alpha, 0, 1); ctx.drawImage(sp.bloom, x - br, y - br, br * 2, br * 2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.95 * alpha; ctx.drawImage(sp.halo, x - rg, y - rg, rg * 2, rg * 2);
        var cr = rg * CORESC[k]; ctx.globalAlpha = alpha; ctx.drawImage(sp.core, x - cr, y - cr, cr * 2, cr * 2);
        if (spikes) {
          var len = size * 2.6 * 2 * GS * (k === 0 || k === 6 || lt >= 0 ? 1.4 : 1);
          ctx.globalAlpha = (k === 0 || k === 6 || lt >= 0 ? 1 : 0.9) * alpha; ctx.fillStyle = '#fff';
          ctx.fillRect(x - len / 2, y - 1.3, len, 2.6); ctx.fillRect(x - 1.3, y - len / 2, 2.6, len);
        }
        ctx.globalAlpha = 1;
      }

      // the words that go with it
      var wf = easeOut((t - WORD0) / 0.5);
      if (wf !== lastWf) {
        lastWf = wf;
        word.style.opacity = wf;
        word.style.setProperty('--ls', ((9 + 14 * (1 - wf)) * u).toFixed(2) + 'px');
        for (j = 0; j < lines.length; j++) lines[j].style.width = (96 * wf * u).toFixed(1) + 'px';
      }
      var co = [sstep(0, 0.4, t) * (1 - sstep(1.7, 2.0, t)), sstep(1.95, 2.3, t) * (1 - sstep(2.95, 3.2, t))];
      for (j = 0; j < caps.length; j++) {
        var v = (co[j] || 0).toFixed(3);
        if (lastCap[j] !== v) { lastCap[j] = v; caps[j].style.opacity = v; caps[j].style.transform = 'translateY(' + ((1 - co[j]) * 12).toFixed(1) + 'px)'; }
      }
    }
    var ps = 0, dirty = true;
    intro = {
      layout: layout,
      update: function (y, dt) {
        var p = clamp((y - top) / Math.max(1, track - vh), 0, 1);
        if (reduce) { ps = 1; } else if (Math.abs(p - ps) > 0.0003) { ps += (p - ps) * (1 - Math.exp(-dt * 9)); dirty = true; } else if (ps !== p) { ps = p; dirty = true; }
        var inView = y + vh > top - 20 && y < top + track + 20;
        if (!inView || !dirty) return;
        dirty = false;
        render(clamp(ps / 0.8, 0, 1) * DUR);
      },
      still: function () { render(DUR); },
      force: function () { dirty = true; }
    };
  }

  /* ============================================================ statements, game panels, game-page scene, reveals */
  var stmts = [], panels = [], gpins = [], heroWrap = null, heroH = 1, header = qs('#bar') || qs('.nav');

  function layoutAll() {
    sizeSky(false);
    if (intro) intro.layout();
    stmts = qsa('.stmt').map(function (el) { return { el: el, top: absTop(el), h: el.offsetHeight }; });
    var pc = qs('.panels');
    panels = pc ? qsa('.panel', pc).map(function (el, i) {
      return { el: el, pin: qs('.pin', el), scene: qs('.pscene', el), copy: qs('.pcopy', el), veil: qs('.pveil', el), top: absTop(pc) + i * el.offsetHeight, h: el.offsetHeight };
    }) : [];
    gpins = qsa('[data-gpin]').map(function (el) {
      var st = qs('.gstage', el);
      return { el: el, scene: qs('.pscene', el), lines: qsa('.gline', el), top: absTop(el), track: el.offsetHeight, vh: st ? st.offsetHeight : win.innerHeight };
    });
    var hero = qs('.hero');
    heroWrap = hero ? qs('.wrap', hero) : null; heroH = hero ? hero.offsetHeight : 1;
  }

  function updateScroll(y) {
    var vh = win.innerHeight, i, o;
    if (header) header.classList.toggle('solid', y > 24);
    if (heroWrap && y < heroH) {                                          // the hero's words drift up and fade as you start to scroll
      var hp = clamp(y / (heroH * 0.7), 0, 1);
      heroWrap.style.transform = 'translate3d(0,' + (-hp * 70).toFixed(1) + 'px,0)'; heroWrap.style.opacity = (1 - hp).toFixed(3);
    }
    for (i = 0; i < stmts.length; i++) {                                  // scale up and fade in as the line enters, ease out as it leaves
      o = stmts[i];
      var c = (o.top + o.h / 2 - y) / vh;
      var vis = sstep(0.95, 0.62, c) * sstep(0.04, 0.34, c);
      var sc = 0.86 + 0.14 * sstep(0.95, 0.5, c) + 0.05 * (1 - sstep(0.04, 0.4, c));
      o.el.style.opacity = vis.toFixed(3); o.el.style.transform = 'scale(' + sc.toFixed(4) + ')';
    }
    for (i = 0; i < panels.length; i++) {                                 // each panel zooms in as it docks; the one it covers dims and sinks back
      o = panels[i];
      var arrive = clamp(1 - (o.top - y) / o.h, 0, 1);
      if (o.scene) o.scene.style.transform = 'scale(' + (1.22 - 0.22 * easeOut(arrive)).toFixed(4) + ')';
      var cp = sstep(0.4, 0.92, arrive);
      if (o.copy) { o.copy.style.opacity = cp.toFixed(3); o.copy.style.transform = 'translate3d(0,' + ((1 - cp) * 56).toFixed(1) + 'px,0)'; }
      var covered = i + 1 < panels.length ? clamp(1 - (panels[i + 1].top - y) / o.h, 0, 1) : 0;
      if (o.pin) o.pin.style.transform = 'scale(' + (1 - 0.07 * covered).toFixed(4) + ')';
      if (o.veil) o.veil.style.opacity = (covered * 0.78).toFixed(3);
    }
    for (i = 0; i < gpins.length; i++) {                                  // the game page's own scene: it zooms and says its three lines
      o = gpins[i];
      if (y + vh < o.top || y > o.top + o.track) continue;
      var gp = clamp((y - o.top) / Math.max(1, o.track - o.vh), 0, 1), n = o.lines.length;
      if (o.scene) o.scene.style.transform = 'scale(' + (1 + 0.3 * easeIO(gp)).toFixed(4) + ')';
      for (var l = 0; l < n; l++) {
        var a = l / n, b = (l + 1) / n, e = 0.07;
        var op = sstep(a, a + e, gp) * (l === n - 1 ? 1 : 1 - sstep(b - e, b, gp));
        o.lines[l].style.opacity = op.toFixed(3);
        o.lines[l].style.transform = 'translate3d(0,' + ((1 - op) * 30).toFixed(1) + 'px,0) scale(' + (0.94 + 0.06 * op).toFixed(4) + ')';
      }
    }
  }

  function initReveals() {
    var cand = qsa('.rv');                                                // (the home page's older reveal class)
    qsa('.block .eyebrow, .block h2, .block p.big, .block .grid, .block .movements, .block .split > div, .block ul, .block .card').forEach(function (el) {
      if (cand.indexOf(el) < 0 && !el.closest('.rv')) cand.push(el);
    });
    cand = cand.filter(function (el) {                                    // never an element inside another one that already reveals
      return !cand.some(function (o) { return o !== el && o.contains(el); });
    });
    var vh = win.innerHeight, pend = [];
    cand.forEach(function (el) {
      if (el.classList.contains('rv')) { pend.push(el); return; }
      if (el.getBoundingClientRect().top > vh * 0.92) { el.classList.add('sr'); pend.push(el); }
    });
    if (reduce || !('IntersectionObserver' in win)) { pend.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    pend.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================ the loop */
  var lastY = -1, lastT = 0, ticking = false, resizeTimer = 0;
  function frame(now) {
    var dt = Math.min(0.1, (now - lastT) / 1000 || 0.016); lastT = now;
    if (sky && !reduce) drawSky(now);
    var y = scrollY();
    if (y !== lastY) { lastY = y; updateScroll(y); if (intro) intro.force(); }
    if (intro) intro.update(y, dt);
    win.requestAnimationFrame(frame);
  }

  function boot() {
    initIntro();
    layoutAll();
    initReveals();
    if (header) header.classList.toggle('solid', scrollY() > 24);
    if (reduce) {
      if (sky) drawSky(performance.now());
      if (intro) intro.still();
      var onS = function () { if (header) header.classList.toggle('solid', scrollY() > 24); };
      win.addEventListener('scroll', onS, { passive: true });
    } else {
      win.requestAnimationFrame(frame);
    }
    win.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { layoutAll(); lastY = -1; if (reduce) { if (sky) drawSky(performance.now()); if (intro) intro.still(); } }, 120);
    });
    win.addEventListener('load', function () { layoutAll(); lastY = -1; if (reduce && intro) intro.still(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { layoutAll(); lastY = -1; if (reduce && intro) intro.still(); });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
