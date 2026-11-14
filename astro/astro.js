/* Orion Lab Studios - THE ORION ASTROLABE.
   Everything here is drawn in code: no images, no video, no libraries, no cookies, no analytics, no network calls
   (the only requests are the optional sound files in /astro/sounds/, and only after the visitor turns sound ON).
   A small WebGL line renderer draws a brass star instrument in thousands of fine glowing lines, in real 3D.
   The stars on the base plate and in Orion are real: positions from the HYG Database v4.1, CC BY-SA 4.0 (astro/stars.js; see astro/STAR-DATA-LICENCE.txt).
   Scroll takes it apart like an exploded engineering drawing; the game rings carry each game's constellation.
   "Reduce motion": a still, assembled astrolabe and normal scrolling. Slow devices get a lighter version automatically.
   Page modes come from <body data-astro="home|game" data-game="cc|ss|sb">. */
(function () {
  'use strict';
  var win = window, doc = document, root = doc.documentElement, body = doc.body;
  function mq(q) { return !!(win.matchMedia && win.matchMedia(q).matches); }
  var MODE = body.getAttribute('data-astro') || 'home';
  var GAME = body.getAttribute('data-game') || 'cc';
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var coarse = mq('(pointer: coarse)');
  var finePointer = mq('(pointer: fine)') && mq('(hover: hover)');
  var DEG = Math.PI / 180;

  /* ------------------------------------------------------------------ quality tier */
  var mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  var tier = 2;
  if (mem <= 2 || cores <= 2 || (coarse && (mem <= 3 || cores <= 4))) tier = 1;
  if (/[?&]lite\b/.test(location.search)) tier = 1;
  var LITE = tier === 1;

  /* ------------------------------------------------------------------ tiny helpers */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sstep(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeIO(x) { x = clamp(x, 0, 1); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function qs(s, r) { return (r || doc).querySelector(s); }
  function qsa(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function scrollY() { return win.pageYOffset || root.scrollTop || 0; }
  function hexRGB(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }

  /* ------------------------------------------------------------------ palette */
  var BRASS = [1.0, 0.79, 0.48], BRASS2 = [0.95, 0.66, 0.38], PALE = [1.0, 0.93, 0.80], STEEL = [0.70, 0.80, 1.0];
  var GAMES = {
    cc: { name: 'CLOUD CHASE', motto: 'AN ADVENTURE ABOVE THE CLOUDS', col: hexRGB('#9fdcff'), hot: hexRGB('#ffe2c6'), num: 'I', ang: 145 * DEG, r0: 1.10, r1: 1.20, teeth: 0, href: '/cloudchase/' },
    ss: { name: 'SPELL SHORE', motto: 'SPELL. FISH. BUILD. DEFEND.', col: hexRGB('#6ef0d2'), hot: hexRGB('#ffd36a'), num: 'II', ang: 35 * DEG, r0: 1.24, r1: 1.34, teeth: 0, href: '/spellshore/' },
    sb: { name: 'SHAFT BOUND', motto: 'DIG. DEFEND. GO DEEPER.', col: hexRGB('#ffb35c'), hot: hexRGB('#8cf2ff'), num: 'III', ang: 270 * DEG, r0: 1.38, r1: 1.48, teeth: 120, href: '/shaftbound/' }
  };
  var SPEC = [[0.62, 0.72, 1], [0.70, 0.80, 1], [0.88, 0.92, 1], [1, 1, 0.94], [1, 0.93, 0.78], [1, 0.80, 0.58], [1, 0.62, 0.40]];
  var BADGE_R = 1.88;

  /* ------------------------------------------------------------------ the engraving font (our own single-stroke letters on a 4 x 6 grid) */
  var FONT = {
    '0': '1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0', '1': '1,5 2,6 2,0;1,0 3,0', '2': '0,5 1,6 3,6 4,5 4,4 0,0 4,0',
    '3': '0,5 1,6 3,6 4,5 4,4 3,3 1.5,3;3,3 4,2 4,1 3,0 1,0 0,1', '4': '3,0 3,6 0,2 4,2', '5': '4,6 0,6 0,3.5 3,3.5 4,2.5 4,1 3,0 1,0 0,1',
    '6': '4,5 3,6 1,6 0,5 0,1 1,0 3,0 4,1 4,2 3,3 0,3', '7': '0,6 4,6 1.5,0', '8': '1,3 0,4 0,5 1,6 3,6 4,5 4,4 3,3 1,3 0,2 0,1 1,0 3,0 4,1 4,2 3,3',
    '9': '4,3 1,3 0,4 0,5 1,6 3,6 4,5 4,1 3,0 1,0 0,1',
    'A': '0,0 2,6 4,0;0.7,2 3.3,2', 'B': '0,0 0,6 3,6 4,5 4,4 3,3 0,3;3,3 4,2 4,1 3,0 0,0', 'C': '4,5 3,6 1,6 0,5 0,1 1,0 3,0 4,1',
    'D': '0,0 0,6 2.5,6 4,4.5 4,1.5 2.5,0 0,0', 'E': '4,6 0,6 0,0 4,0;0,3 3,3', 'F': '4,6 0,6 0,0;0,3 3,3',
    'G': '4,5 3,6 1,6 0,5 0,1 1,0 3,0 4,1 4,3 2.5,3', 'H': '0,0 0,6;4,0 4,6;0,3 4,3', 'I': '1,6 3,6;2,6 2,0;1,0 3,0',
    'J': '4,6 4,1 3,0 1,0 0,1', 'K': '0,0 0,6;4,6 0,2;1.3,3.3 4,0', 'L': '0,6 0,0 4,0', 'M': '0,0 0,6 2,3 4,6 4,0',
    'N': '0,0 0,6 4,0 4,6', 'O': '1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0', 'P': '0,0 0,6 3,6 4,5 4,4 3,3 0,3',
    'Q': '1,0 3,0 4,1 4,5 3,6 1,6 0,5 0,1 1,0;2.5,1.5 4,-0.5', 'R': '0,0 0,6 3,6 4,5 4,4 3,3 0,3;2,3 4,0',
    'S': '4,5 3,6 1,6 0,5 0,4 1,3 3,3 4,2 4,1 3,0 1,0 0,1', 'T': '0,6 4,6;2,6 2,0', 'U': '0,6 0,1 1,0 3,0 4,1 4,6',
    'V': '0,6 2,0 4,6', 'W': '0,6 1,0 2,4 3,0 4,6', 'X': '0,0 4,6;0,6 4,0', 'Y': '0,6 2,3 4,6;2,3 2,0', 'Z': '0,6 4,6 0,0 4,0',
    '.': '1.6,0 2.4,0 2.4,0.8 1.6,0.8 1.6,0', '*': '1.6,2.6 2.4,2.6 2.4,3.4 1.6,3.4 1.6,2.6', '-': '1,3 3,3', '+': '1,3 3,3;2,2 2,4',
    '^': '1,6 2,6 2,5 1,5 1,6', '\'': '2,6 1.5,4.5', '/': '0,0 4,6', ':': '1.6,1 2.4,1 2.4,1.8 1.6,1.8 1.6,1;1.6,4 2.4,4 2.4,4.8 1.6,4.8 1.6,4',
    ',': '2.2,0.8 1.6,-0.8', '#': '1,0 1.5,6;2.5,0 3,6;0,2 4,2;0,4 4,4'
  };   // '*' is a centred dot and '^' a degree sign
  var GL_CACHE = {};
  function glyph(ch) {
    if (GL_CACHE.hasOwnProperty(ch)) return GL_CACHE[ch];
    var d = FONT[ch], out = null;
    if (d) out = d.split(';').map(function (s) { return s.trim().split(/\s+/).map(function (p) { return p.split(',').map(Number); }); });
    GL_CACHE[ch] = out; return out;
  }
  function textWidth(str, size) { return (str.length * 5 - 1) * size / 6; }

  /* ------------------------------------------------------------------ geometry builder */
  function Geo() { this.L = []; this.P = []; }
  Geo.prototype.seg = function (x1, y1, z1, x2, y2, z2, c, a, o) {
    o = o || 0; this.L.push(x1, y1, z1, c[0], c[1], c[2], a, o, x2, y2, z2, c[0], c[1], c[2], a, o);
  };
  Geo.prototype.line = function (x1, y1, x2, y2, z, c, a, o) { this.seg(x1, y1, z, x2, y2, z, c, a, o); };
  Geo.prototype.poly = function (pts, z, c, a, o, closed) {
    for (var i = 1; i < pts.length; i++) this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], z, c, a, o);
    if (closed && pts.length > 2) this.line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], z, c, a, o);
  };
  Geo.prototype.arc = function (cx, cy, r, a0, a1, z, c, a, o, n) {
    n = n || Math.max(8, Math.round(Math.abs(a1 - a0) * r * 34));
    var px = cx + r * Math.cos(a0), py = cy + r * Math.sin(a0);
    for (var i = 1; i <= n; i++) { var t = a0 + (a1 - a0) * i / n, x = cx + r * Math.cos(t), y = cy + r * Math.sin(t); this.line(px, py, x, y, z, c, a, o); px = x; py = y; }
  };
  Geo.prototype.circle = function (cx, cy, r, z, c, a, o, n) { this.arc(cx, cy, r, 0, Math.PI * 2, z, c, a, o, n || Math.max(48, Math.round(r * 150))); };
  Geo.prototype.dashCircle = function (cx, cy, r, z, c, a, o, n) {
    n = n || Math.max(60, Math.round(r * 120));
    for (var i = 0; i < n; i += 2) { var t0 = i / n * 6.2832, t1 = (i + 1) / n * 6.2832; this.line(cx + r * Math.cos(t0), cy + r * Math.sin(t0), cx + r * Math.cos(t1), cy + r * Math.sin(t1), z, c, a, o); }
  };
  // points: size is in world units; kind 0 star, 1 Betelgeuse core, 2 soft glow, 3 Betelgeuse halo
  Geo.prototype.pt = function (x, y, z, size, c, a, o, kind) { this.P.push(x, y, z, c[0], c[1], c[2], a, size, o || 0, kind || 0); };
  // straight text, centred on (x, y), rotated by rot
  Geo.prototype.text = function (str, x, y, z, size, rot, c, a, o) {
    var s = size / 6, w = textWidth(str, size), cr = Math.cos(rot || 0), sr = Math.sin(rot || 0), self = this;
    for (var i = 0; i < str.length; i++) {
      var g = glyph(str[i]); if (!g) continue;
      var ox = i * 5 * s - w / 2;
      g.forEach(function (stroke) {
        var pts = stroke.map(function (p) { var lx = ox + p[0] * s, ly = (p[1] - 3) * s; return [x + lx * cr - ly * sr, y + lx * sr + ly * cr]; });
        self.poly(pts, z, c, a, o);
      });
    }
  };
  // text bent along a circle; on the lower half it is flipped so it always reads left to right
  Geo.prototype.arcText = function (str, cx, cy, r, ang, size, z, c, a, o, flip) {
    var s = size / 6, w = textWidth(str, size), self = this;
    if (flip === undefined) flip = Math.sin(ang) < -0.05;
    var start = flip ? ang - w / r / 2 : ang + w / r / 2;
    for (var i = 0; i < str.length; i++) {
      var g = glyph(str[i]); if (!g) continue;
      g.forEach(function (stroke) {
        var pts = stroke.map(function (p) {
          var along = (i * 5 + p[0]) * s, t = flip ? start + along / r : start - along / r, rr = flip ? r - (p[1] - 3) * s : r + (p[1] - 3) * s;
          return [cx + rr * Math.cos(t), cy + rr * Math.sin(t)];
        });
        self.poly(pts, z, c, a, o);
      });
    }
  };

  /* ------------------------------------------------------------------ the real stars */
  var STARS = [];
  (function () {
    var b64 = win.ASTRO_STARS || '';
    try { var bin = atob(b64); } catch (e) { bin = ''; }
    for (var i = 0; i + 5 < bin.length; i += 6) {
      var ra = (bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8)) / 65535 * 24;
      var dr = bin.charCodeAt(i + 2) | (bin.charCodeAt(i + 3) << 8); if (dr > 32767) dr -= 65536;
      STARS.push({ ra: ra, dec: dr / 100, mag: bin.charCodeAt(i + 4) / 20 - 2, sp: bin.charCodeAt(i + 5) });
    }
  })();
  var ORION = (win.ASTRO_ORION || []).map(function (r) { return { id: r[0], ra: r[1], dec: r[2], mag: r[3], sp: 'OBAFGKM'.indexOf(r[4]) }; });
  var STAR_COUNT = LITE ? Math.min(STARS.length, 1100) : STARS.length;   // brightest first, so the light version is a prefix

  // base plate projection: stereographic from the south pole, like a real astrolabe plate (dec -30 at the plate's edge)
  var KST = 0.84 / Math.tan(60 * DEG), RAROT = 36 * DEG;
  function stereo(raH, dec) { var r = KST * Math.tan((90 - dec) * DEG / 2), t = raH * 15 * DEG + RAROT; return [r * Math.cos(t), r * Math.sin(t), r]; }
  // the star frame: Orion large, in a flat chart projection (east to the left, as on a star chart)
  var ORA = 5.55, ODE = 4.6, OSC = 0.040;
  function orp(raH, dec) { return [-(raH - ORA) * 15 * Math.cos(ODE * DEG) * OSC, (dec - ODE) * OSC]; }

  /* ------------------------------------------------------------------ the parts */
  function buildBase(g) {
    var B = BRASS, z = 0;
    [1.075, 1.07, 1.0, 0.985, 0.93, 0.915, 0.86].forEach(function (r, i) { g.circle(0, 0, r, z, B, i < 2 ? 0.55 : 0.42); });
    for (var h = 0; h < 720; h++) {
      if (LITE && h % 2) continue;
      var d = h / 2, t = d * DEG, r0 = d % 10 === 0 ? 0.93 : d % 5 === 0 ? 0.948 : d % 1 === 0 ? 0.964 : 0.975;
      g.line(r0 * Math.cos(t), r0 * Math.sin(t), 0.985 * Math.cos(t), 0.985 * Math.sin(t), z, B, d % 5 === 0 ? 0.5 : 0.3);
    }
    for (var d2 = 0; d2 < 360; d2 += 10) g.arcText(String(d2), 0, 0, 1.0355, d2 * DEG, 0.026, z, PALE, 0.55);
    var RN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (var hh = 0; hh < 24; hh++) {
      var t2 = hh * 15 * DEG;
      g.line(0.86 * Math.cos(t2), 0.86 * Math.sin(t2), 0.915 * Math.cos(t2), 0.915 * Math.sin(t2), z, B, 0.45);
      g.arcText(RN[hh % 12], 0, 0, 0.8875, t2 + 7.5 * DEG, 0.024, z, B, 0.6);
    }
    // the sky map: celestial circles, hour lines and the real stars
    [0, 23.44, -23.44].forEach(function (dec) { g.circle(0, 0, stereo(0, dec)[2], z, STEEL, dec === 0 ? 0.32 : 0.2); });
    for (var ra = 0; ra < 24; ra++) {
      var a = stereo(ra, 84), b = stereo(ra, -30);
      if (ra % 2 === 0 || !LITE) g.line(a[0], a[1], b[0], b[1], z, STEEL, ra % 6 === 0 ? 0.16 : 0.07);
    }
    var ecl = [];
    for (var l = 0; l <= 180; l++) { var lam = l * 2 * DEG, de = Math.asin(Math.sin(23.44 * DEG) * Math.sin(lam)) / DEG, rh = Math.atan2(Math.cos(23.44 * DEG) * Math.sin(lam), Math.cos(lam)) / DEG / 15; ecl.push(stereo((rh + 24) % 24, de)); }
    g.poly(ecl, z, [1, 0.85, 0.55], 0.28);
    for (var i = 0; i < STAR_COUNT; i++) {
      var s = STARS[i]; if (s.dec < -30) continue;
      var p = stereo(s.ra, s.dec), m = s.mag;
      g.pt(p[0], p[1], z + 0.001, 0.0035 + 0.0042 * Math.max(0, 5.9 - m), SPEC[s.sp] || SPEC[2], clamp(0.95 - m * 0.08, 0.45, 1), 0, 0);
    }
    g.arcText('SKY MAP * ' + STAR_COUNT + ' REAL STARS * HYG DATABASE * CC BY-SA 4.0 * J2000 * NORTH POLE CENTRED', 0, 0, 0.838, 270 * DEG, 0.017, z, PALE, 0.38, true);
    g.circle(0, 0, 0.012, z, B, 0.7); g.circle(0, 0, 0.022, z, B, 0.5);
  }

  function buildGrid(g) {
    var lat = 18.4 * DEG, z = 0, C = [0.78, 0.86, 1.0];
    g.circle(0, 0, 0.86, z, BRASS, 0.42); g.circle(0, 0, 0.852, z, BRASS, 0.25);
    function plate(h, A) {   // altitude h and azimuth A (from north) -> plate position for latitude 18.4 N
      var sd = Math.sin(h) * Math.sin(lat) + Math.cos(h) * Math.cos(lat) * Math.cos(A);
      var dec = Math.asin(clamp(sd, -1, 1));
      var ha = Math.atan2(-Math.sin(A) * Math.cos(h), Math.sin(h) * Math.cos(lat) - Math.cos(h) * Math.sin(lat) * Math.cos(A));
      var r = KST * Math.tan((Math.PI / 2 - dec) / 2), t = -ha + Math.PI / 2;
      return [r * Math.cos(t), r * Math.sin(t), r];
    }
    function curve(fn, n, a, col, dashed) {
      var prev = null;
      for (var i = 0; i <= n; i++) {
        var p = fn(i / n);
        if (p[2] > 0.85) { prev = null; continue; }
        if (prev && !(dashed && i % 2)) g.line(prev[0], prev[1], p[0], p[1], z, col, a);
        prev = p;
      }
    }
    var step = LITE ? 10 : 5;
    for (var hd = 0; hd < 90; hd += step) {
      (function (hdeg) { curve(function (u) { return plate(hdeg * DEG, u * 2 * Math.PI); }, 160, hdeg === 0 ? 0.62 : (hdeg % 30 === 0 ? 0.34 : 0.2), hdeg === 0 ? BRASS : C); })(hd);
    }
    [-6, -12, -18].forEach(function (hdeg) { curve(function (u) { return plate(hdeg * DEG, u * 2 * Math.PI); }, 160, 0.16, C, true); });
    for (var az = 0; az < 360; az += (LITE ? 20 : 10)) {
      (function (A) { curve(function (u) { return plate(u * 89.5 * DEG, A * DEG); }, 60, A % 90 === 0 ? 0.32 : 0.14, C); })(az);
    }
    var zen = plate(Math.PI / 2 - 0.0001, 0); g.circle(zen[0], zen[1], 0.012, z, BRASS, 0.7);
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(function (c) { var p = plate(3 * DEG, c[1] * DEG); if (p[2] < 0.83) g.text(c[0], p[0], p[1], z, 0.03, 0, PALE, 0.7); });
    g.arcText('SKY GRID * LATITUDE 18^ N * ALTITUDE EVERY ' + step + '^ * AZIMUTH EVERY ' + (LITE ? 20 : 10) + '^', 0, 0, 0.83, 90 * DEG, 0.017, z, PALE, 0.4);
  }

  // Orion's figure: indices into astro/stars.js's ASTRO_ORION
  var OR_EDGES = [[0, 1], [1, 2], [0, 5], [2, 3], [5, 4], [4, 3], [5, 6], [3, 7], [0, 8], [8, 10], [10, 11], [11, 12], [10, 9], [2, 15], [19, 13], [13, 14], [14, 15], [15, 16], [16, 17], [17, 18], [20, 21], [21, 22]];
  var OR_NAMES = [[0, 'Betelgeuse', -1], [1, 'Meissa', 0], [2, 'Bellatrix', 1], [3, 'Mintaka', 1], [4, 'Alnilam', 0], [5, 'Alnitak', -1], [6, 'Saiph', 0], [7, 'Rigel', 0]];
  var ORION_POS = [];
  function buildFrame(g) {
    var z = 0, B = BRASS;
    [0.86, 0.845, 0.80].forEach(function (r, i) { g.circle(0, 0, r, z, B, i === 2 ? 0.2 : 0.5); });
    // the rete's tracery: curling arms from the rim, like the openwork of an old instrument
    for (var k = 0; k < 16; k++) {
      var base = k / 16 * Math.PI * 2, pts = [];
      for (var i = 0; i <= 18; i++) { var u = i / 18, r = 0.845 - u * 0.075, t = base + Math.sin(u * Math.PI) * 0.09 + u * 0.05; pts.push([r * Math.cos(t), r * Math.sin(t)]); }
      g.poly(pts, z, B, 0.32);
      var e = pts[pts.length - 1]; g.circle(e[0], e[1], 0.006, z, B, 0.5, 0, 10);
    }
    // the field: every catalogue star inside the frame
    for (var j = 0; j < STAR_COUNT; j++) {
      var s = STARS[j]; if (s.ra < 3.6 || s.ra > 7.5 || s.dec < -22 || s.dec > 32) continue;
      var p = orp(s.ra, s.dec); if (p[0] * p[0] + p[1] * p[1] > 0.77 * 0.77) continue;
      g.pt(p[0], p[1], z, 0.006 + 0.0045 * Math.max(0, 5.8 - s.mag), SPEC[s.sp] || SPEC[2], 0.55, 0, 0);
    }
    // Orion: lines draw in edge by edge, each star lights as a line reaches it
    ORION_POS = ORION.map(function (s) { return orp(s.ra, s.dec); });
    var lit = ORION.map(function () { return 1; }), E = OR_EDGES.length;
    lit[0] = 0.02;
    OR_EDGES.forEach(function (ed, i) {
      var o = 0.04 + 0.9 * i / E, a = ORION_POS[ed[0]], b = ORION_POS[ed[1]];
      var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy), gp = 0.022;
      if (L > gp * 2.4) {   // stop short of each star, like an old star chart
        var ux = dx / L, uy = dy / L, N = 8;
        for (var q = 0; q < N; q++) {
          var t0 = gp + (L - 2 * gp) * q / N, t1 = gp + (L - 2 * gp) * (q + 1) / N;
          g.line(a[0] + ux * t0, a[1] + uy * t0, a[0] + ux * t1, a[1] + uy * t1, z, PALE, 0.75, o + 0.9 / E * q / N);
        }
      }
      lit[ed[0]] = Math.min(lit[ed[0]], o); lit[ed[1]] = Math.min(lit[ed[1]], o + 0.9 / E);
    });
    ORION.forEach(function (s, i) {
      var p = ORION_POS[i], col = SPEC[s.sp] || SPEC[2], size = 0.012 + 0.0095 * Math.max(0, 5.4 - s.mag), o = lit[i];
      if (i === 0) {   // Betelgeuse: the biggest, deep orange, slowly breathing (kind 1 core, kind 3 halo)
        g.pt(p[0], p[1], z, 0.085, [1, 0.52, 0.22], 0.95, o, 1);
        g.pt(p[0], p[1], z, 0.42, [1, 0.40, 0.16], 0.42, o, 3);
        col = [1, 0.62, 0.32];
      } else if (i === 7) { size *= 1.35; col = [0.72, 0.84, 1]; g.pt(p[0], p[1], z, 0.22, [0.55, 0.7, 1], 0.32, o, 2); }
      else if (i === 21) {   // the Orion Nebula: a soft pink cloud in the sword
        g.pt(p[0], p[1], z, 0.11, [1, 0.55, 0.80], 0.30, o, 2);
        g.pt(p[0] + 0.008, p[1] - 0.006, z, 0.19, [0.66, 0.46, 1], 0.16, o, 2);
      }
      g.pt(p[0], p[1], z, size, col, 1, o, 0);
      if (s.mag < 2.3) {   // four-point spikes on the brightest
        var sl = 0.05 + (2.3 - s.mag) * 0.03;
        g.line(p[0] - sl, p[1], p[0] + sl, p[1], z, col, 0.28, o); g.line(p[0], p[1] - sl, p[0], p[1] + sl, z, col, 0.28, o);
      }
    });
    g.arcText('ORION * THE HUNTER * RA 05H 33M * DEC +04^ 36\' * ' + ORION.length + ' STARS', 0, 0, 0.822, 270 * DEG, 0.019, z, PALE, 0.42, true);
  }

  function buildArm(g) {
    var z = 0, B = BRASS, w = 0.028, L = 1.06;
    g.poly([[-L, 0], [-L + 0.06, w], [L - 0.06, w], [L, 0], [L - 0.06, -w], [-L + 0.06, -w]], z, B, 0.75, 0, true);
    g.line(-L, 0, L, 0, z, PALE, 0.35);
    for (var i = 0; i <= 90; i++) {   // a 0-90 degree scale on each half (the declination scale of a real rule)
      var x = 0.07 + (L - 0.13) * i / 90, h = i % 10 === 0 ? 0.022 : i % 5 === 0 ? 0.015 : 0.009;
      g.line(x, w, x, w - h, z, B, 0.55); g.line(-x, -w, -x, -w + h, z, B, 0.55);
      if (i % 10 === 0 && i > 0) { g.text(String(i), x, -w - 0.022, z, 0.02, 0, PALE, 0.55); g.text(String(i), -x, w + 0.022, z, 0.02, Math.PI, PALE, 0.55); }
    }
    [0.06, 0.045, 0.02].forEach(function (r) { g.circle(0, 0, r, z, B, 0.7, 0, 40); });
    g.poly([[-0.03, 0.06], [0, 0.11], [0.03, 0.06]], z, B, 0.6);   // the wedge ("horse") that holds the pin
  }

  function gearShape(g, n, r, z, c, a) {
    var m = 2 * r / n, ro = r + m, ri = r - 1.25 * m, step = Math.PI * 2 / n, pts = [];
    for (var i = 0; i < n; i++) {
      var t = i * step;
      pts.push([ri * Math.cos(t), ri * Math.sin(t)], [ro * Math.cos(t + step * 0.22), ro * Math.sin(t + step * 0.22)],
               [ro * Math.cos(t + step * 0.48), ro * Math.sin(t + step * 0.48)], [ri * Math.cos(t + step * 0.70), ri * Math.sin(t + step * 0.70)]);
    }
    g.poly(pts, z, c, a, 0, true);
    var rim = ri - m * 1.6; g.circle(0, 0, rim, z, c, a * 0.8); g.circle(0, 0, r * 0.2, z, c, a); g.circle(0, 0, r * 0.08, z, c, a);
    var spokes = n >= 40 ? 6 : 4;
    for (var k = 0; k < spokes; k++) {
      var t1 = k / spokes * Math.PI * 2, d = 0.13;
      [-d, d].forEach(function (off) {
        var a0 = t1 + off * 0.5, a1 = t1 + off * r * 0.4 / rim;
        g.line(r * 0.2 * Math.cos(a0), r * 0.2 * Math.sin(a0), rim * Math.cos(a1), rim * Math.sin(a1), z, c, a * 0.85);
      });
    }
  }

  function buildRing(g, key) {
    var G = GAMES[key], z = 0, r0 = G.r0, r1 = G.r1, c = G.col;
    [r0, r0 + 0.006, r1 - 0.006, r1].forEach(function (r, i) { g.circle(0, 0, r, z, i % 3 === 0 ? BRASS : c, i % 3 === 0 ? 0.5 : 0.28); });
    for (var d = 0; d < 360; d += (LITE ? 2 : 1)) {
      var t = d * DEG, h = d % 10 === 0 ? 0.03 : d % 5 === 0 ? 0.02 : 0.012;
      g.line((r0 + 0.006) * Math.cos(t), (r0 + 0.006) * Math.sin(t), (r0 + 0.006 + h) * Math.cos(t), (r0 + 0.006 + h) * Math.sin(t), z, c, 0.4);
    }
    var phrase = G.name + ' * ' + G.motto + ' * ', rm = (r0 + r1) / 2 + 0.013, size = 0.026;
    var per = textWidth(phrase, size) + size * 5 / 6, reps = Math.floor(2 * Math.PI * rm / per);
    for (var k = 0; k < reps; k++) g.arcText(phrase, 0, 0, rm, Math.PI / 2 - (k + 0.5) * per / rm, size, z, c, 0.62, false);
    if (G.teeth) {
      var n = G.teeth, step = Math.PI * 2 / n, ro = r1 + 0.035, pts = [];
      for (var i = 0; i < n; i++) { var tt = i * step; pts.push([r1 * Math.cos(tt), r1 * Math.sin(tt)], [ro * Math.cos(tt + step * 0.2), ro * Math.sin(tt + step * 0.2)], [ro * Math.cos(tt + step * 0.5), ro * Math.sin(tt + step * 0.5)], [r1 * Math.cos(tt + step * 0.7), r1 * Math.sin(tt + step * 0.7)]); }
      g.poly(pts, z, BRASS, 0.5, 0, true);
    }
  }

  // each game's constellation, built from polylines (Pep's prototype shapes, y up, roughly -1..1)
  function arcPts(x0, y0, r, a0, a1, n) { var o = []; for (var i = 0; i < n; i++) { var a = (a0 + (a1 - a0) * i / (n - 1)) * DEG; o.push([x0 + Math.cos(a) * r, -(y0 - Math.sin(a) * r)]); } return o; }
  function flipY(p) { return p.map(function (q) { return [q[0], -q[1]]; }); }
  function shapeOf(key) {
    if (key === 'cc') {
      var cl = arcPts(-0.5, 0.06, 0.3, 190, 85, 4).concat(arcPts(0, -0.16, 0.38, 150, 30, 5), arcPts(0.5, 0.06, 0.3, 95, -10, 4), flipY([[0.55, 0.32], [0, 0.34], [-0.55, 0.32]]));
      return { lines: [{ p: cl, closed: true }], extra: flipY([[0, -0.54], [-0.79, 0.12], [0.79, 0.12]]), hot: [] };
    }
    if (key === 'ss') {
      var T = [-0.14, -0.5], SUN = [0.8, -0.82];
      return { lines: [
        { p: flipY([[-0.92, 0.6], [-0.56, 0.44], [-0.2, 0.38], [0.12, 0.38], [0.46, 0.43], [0.92, 0.6]]) },
        { p: flipY([[0.12, 0.38], [0.12, 0.12], [0.05, -0.14], [-0.05, -0.34], T]) },
        { p: flipY([T, [0.1, -0.66], [0.36, -0.64], [0.54, -0.48]]) }, { p: flipY([T, [0.12, -0.48], [0.3, -0.36], [0.4, -0.18]]) },
        { p: flipY([T, [-0.38, -0.68], [-0.62, -0.62], [-0.78, -0.44]]) }, { p: flipY([T, [-0.36, -0.46], [-0.52, -0.32], [-0.58, -0.12]]) }
      ], extra: flipY([T]), hot: flipY([SUN]) };
    }
    var head = []; for (var i = 0; i < 7; i++) { var t = i / 6 * 2 - 1; head.push([t * 0.86, -0.6 + 0.36 * t * t]); }
    var rot = function (pts) { var c = Math.cos(-0.42), s = Math.sin(-0.42); return flipY(pts).map(function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; }); };
    return { lines: [{ p: rot(head) }, { p: rot([[0, -0.6], [0, -0.2], [0, 0.25], [0, 0.62], [0, 0.9]]) }], extra: [], hot: rot([[0.86, -0.24], [-0.86, -0.24]]) };
  }
  function buildBadge(g, key, S, withBracket) {
    var G = GAMES[key], z = 0, c = G.col, B = BRASS;
    [0.30, 0.292, 0.262, 0.255].forEach(function (r, i) { g.circle(0, 0, r * S, z, i % 3 === 0 ? B : c, i % 3 === 0 ? 0.6 : 0.32, 0, Math.round(80 + S * 60)); });
    for (var k = 0; k < 72; k++) {
      var t = k / 72 * Math.PI * 2, r0 = (k % 6 === 0 ? 0.262 : 0.272) * S;
      g.line(r0 * Math.cos(t), r0 * Math.sin(t), 0.292 * S * Math.cos(t), 0.292 * S * Math.sin(t), z, c, 0.45);
    }
    g.arcText(G.name, 0, 0, 0.236 * S, Math.PI / 2, 0.024 * S, z, PALE, 0.7, false);
    g.arcText('RING ' + G.num, 0, 0, 0.236 * S, -Math.PI / 2, 0.018 * S, z, c, 0.55, true);
    // the constellation: lines draw in, then the stars light, one by one
    var sh = shapeOf(key), sc = 0.165 * S, seen = {}, order = 0, total = 0;
    sh.lines.forEach(function (ln) { total += ln.p.length - 1 + (ln.closed ? 1 : 0); });
    function star(p, o, hot, big) {
      var k2 = p[0].toFixed(3) + ',' + p[1].toFixed(3); if (seen[k2]) return; seen[k2] = 1;
      var col = hot ? G.hot : c, sz = (big ? 0.016 : 0.010) * S;
      g.pt(p[0] * sc, p[1] * sc, z, sz, col, 1, o, 0);
      g.pt(p[0] * sc, p[1] * sc, z, sz * 5, col, 0.22, o, 2);
    }
    sh.lines.forEach(function (ln) {
      var pts = ln.p.slice(); if (ln.closed) pts.push(pts[0]);
      for (var i = 1; i < pts.length; i++) {
        var o = 0.05 + 0.85 * order / total; order++;
        var a = pts[i - 1], b = pts[i];
        for (var q = 0; q < 5; q++) {
          var u0 = q / 5, u1 = (q + 1) / 5;
          g.line((a[0] + (b[0] - a[0]) * u0) * sc, (a[1] + (b[1] - a[1]) * u0) * sc, (a[0] + (b[0] - a[0]) * u1) * sc, (a[1] + (b[1] - a[1]) * u1) * sc, z, c, 0.8, o + 0.85 / total * q / 5);
        }
        star(a, o, false, i === 1); star(b, o + 0.85 / total, false, i === pts.length - 1);
      }
    });
    sh.extra.forEach(function (p) { star(p, 0.96, false, true); });
    sh.hot.forEach(function (p) { star(p, 0.98, true, true); if (key === 'ss') g.circle(p[0] * sc, p[1] * sc, 0.03 * S, z, G.hot, 0.6, 0.98, 24); });
    if (withBracket) {   // the arm that holds the medallion on its ring (the medallion stays upright; the arm points at the centre)
      var dx = -Math.cos(G.ang), dy = -Math.sin(G.ang), nx = -dy, ny = dx, reach = BADGE_R - G.r1;
      [-0.06, 0.06].forEach(function (off) { g.line(dx * 0.3 + nx * off, dy * 0.3 + ny * off, dx * reach + nx * off * 0.55, dy * reach + ny * off * 0.55, z, B, 0.45); });
      g.line(dx * 0.3, dy * 0.3, dx * reach, dy * reach, z, c, 0.25);
      for (var q = 1; q < 6; q++) { var u = 0.3 + (reach - 0.3) * q / 6, w = 0.06 * lerp(1, 0.55, q / 6); g.line(dx * u + nx * w, dy * u + ny * w, dx * u - nx * w, dy * u - ny * w, z, B, 0.3); }
    }
  }

  function buildGears(g, parts) {
    // three wheels that really mesh: module 0.02, 60 / 30 / 20 teeth
    return [
      { n: 60, r: 0.6, x: 0, y: 0, ratio: 1 },
      { n: 30, r: 0.3, x: 0.9 * Math.cos(35 * DEG), y: 0.9 * Math.sin(35 * DEG), ratio: -2 },
      { n: 20, r: 0.2, x: 0.9 * Math.cos(35 * DEG) + 0.5 * Math.cos(-45 * DEG), y: 0.9 * Math.sin(35 * DEG) + 0.5 * Math.sin(-45 * DEG), ratio: 3 }
    ].map(function (w) { var gg = new Geo(); gearShape(gg, w.n, w.r, 0, BRASS2, 0.55); return { geo: gg, cx: w.x, cy: w.y, ratio: w.ratio }; });
  }

  /* ------------------------------------------------------------------ WebGL */
  var cv = doc.getElementById('astro');
  var gl = null;
  if (cv && !win.__astroNoGL) {
    try {
      var opts = { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
      gl = cv.getContext('webgl', opts) || cv.getContext('experimental-webgl', opts);
    } catch (e) { gl = null; }
  }
  if (!gl) { root.classList.add('astro-nogl'); return; }   // the page reads normally without it
  var ON = !reduce;
  if (ON) root.classList.add('astro-on'); else root.classList.add('astro-still');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  function prog(vs, fs) {
    var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('astro shader: ' + gl.getProgramInfoLog(p));
    return p;
  }
  var LINE_VS = 'attribute vec3 p;attribute vec4 c;attribute float o;uniform mat4 m;uniform float al,rv,gw;varying vec4 v;' +
    'void main(){gl_Position=m*vec4(p,1.);float r=clamp((rv-o)*14.+1.,0.,1.);v=vec4(c.rgb*gw,c.a*al*mix(.13,1.,r));}';
  var LINE_FS = 'precision mediump float;varying vec4 v;void main(){gl_FragColor=vec4(v.rgb*v.a,v.a);}';
  var PT_VS = 'attribute vec3 p;attribute vec4 c;attribute vec3 s;uniform mat4 m;uniform float al,rv,gw,tm,px,nv;varying vec4 v;varying float k;' +
    'void main(){vec4 q=m*vec4(p,1.);gl_Position=q;float r=clamp((rv-s.y)*14.+1.,0.,1.);float sz=s.x,br=1.;' +
    'if(s.z>.5&&s.z<1.5||s.z>2.5){sz*=1.+.09*sin(tm*.9)+nv*(s.z>2.5?2.2:6.);br+=nv*1.6;}' +
    'float pz=sz*px/q.w;float f=pz<1.4?pz/1.4:1.;gl_PointSize=clamp(pz,1.4,240.)*mix(.65,1.,r);' +
    'v=vec4(c.rgb*gw*br,c.a*al*f*mix(.28,1.,r));k=s.z;}';
  var PT_FS = 'precision mediump float;varying vec4 v;varying float k;void main(){vec2 d=gl_PointCoord*2.-1.;float q=dot(d,d);if(q>1.)discard;' +
    'float a=k>1.5?exp(-q*3.2)*(1.-q):exp(-q*16.)+exp(-q*4.)*.32;gl_FragColor=vec4(v.rgb*v.a*a,v.a*a);}';
  var Q_VS = 'attribute vec2 p;varying vec2 u;void main(){u=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  var BLUR_FS = 'precision mediump float;varying vec2 u;uniform sampler2D t;uniform vec2 d;void main(){vec4 s=texture2D(t,u)*.227;' +
    's+=(texture2D(t,u+d*1.385)+texture2D(t,u-d*1.385))*.316;s+=(texture2D(t,u+d*3.231)+texture2D(t,u-d*3.231))*.07;gl_FragColor=s;}';
  var ADD_FS = 'precision mediump float;varying vec2 u;uniform sampler2D t;uniform float k;void main(){gl_FragColor=texture2D(t,u)*k;}';

  var LP, PP, BP, AP;
  try {
    LP = prog(LINE_VS, LINE_FS); PP = prog(PT_VS, PT_FS); BP = prog(Q_VS, BLUR_FS); AP = prog(Q_VS, ADD_FS);
  } catch (e) { root.classList.remove('astro-on', 'astro-still'); root.classList.add('astro-nogl'); return; }
  function loc(p, names, kind) { var o = {}; names.forEach(function (n) { o[n] = kind === 'a' ? gl.getAttribLocation(p, n) : gl.getUniformLocation(p, n); }); return o; }
  var LA = loc(LP, ['p', 'c', 'o'], 'a'), LU = loc(LP, ['m', 'al', 'rv', 'gw']);
  var PA = loc(PP, ['p', 'c', 's'], 'a'), PU = loc(PP, ['m', 'al', 'rv', 'gw', 'tm', 'px', 'nv']);
  var BA = loc(BP, ['p'], 'a'), BU = loc(BP, ['t', 'd']), AA = loc(AP, ['p'], 'a'), AU = loc(AP, ['t', 'k']);
  var quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  function upload(geo) {
    var o = { ln: geo.L.length / 8, pn: geo.P.length / 10, lb: null, pb: null };
    if (o.ln) { o.lb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o.lb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.L), gl.STATIC_DRAW); }
    if (o.pn) { o.pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, o.pb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geo.P), gl.STATIC_DRAW); }
    return o;
  }

  /* ------------------------------------------------------------------ the scene: layers (things that move apart) made of parts */
  var LAYERS = [], BYNAME = {}, SEGS = 0, PTS = 0;
  function layer(name, zx, parts, opt) {
    opt = opt || {};
    var L = { name: name, zx: zx, parts: parts, e: 0, ev: 0, et: 0, asm: ON ? 0 : 1, av: 0, flash: 0, lastLock: 0, alock: false,
      alpha: 1, aA: opt.aA == null ? 1 : opt.aA, aX: opt.aX == null ? 1 : opt.aX, rv: opt.rv == null ? 1 : opt.rv, order: opt.order || 0, z: 0 };
    parts.forEach(function (p) { p.buf = upload(p.geo); SEGS += p.buf.ln / 2; PTS += p.buf.pn; p.spin = p.spin || 0; p.cx = p.cx || 0; p.cy = p.cy || 0; p.k = p.k || 1; });
    LAYERS.push(L); BYNAME[name] = L; return L;
  }
  function part(build, extra) { var g = new Geo(); build(g); var p = extra || {}; p.geo = g; return p; }

  if (MODE === 'home') {
    // back to front: the three game rings, the gear train, the base plate, the sky grid, the star frame, the pointer arm
    var GAP = 0.62;
    layer('sb', -4 * GAP, [part(function (g) { buildRing(g, 'sb'); }, { role: 'band' }), part(function (g) { buildBadge(g, 'sb', 1, true); }, { role: 'badge', cx: BADGE_R * Math.cos(GAMES.sb.ang), cy: BADGE_R * Math.sin(GAMES.sb.ang), rot: GAMES.sb.ang })], { order: 6, rv: 0 });
    layer('ss', -3 * GAP, [part(function (g) { buildRing(g, 'ss'); }, { role: 'band' }), part(function (g) { buildBadge(g, 'ss', 1, true); }, { role: 'badge', cx: BADGE_R * Math.cos(GAMES.ss.ang), cy: BADGE_R * Math.sin(GAMES.ss.ang), rot: GAMES.ss.ang })], { order: 5, rv: 0 });
    layer('cc', -2 * GAP, [part(function (g) { buildRing(g, 'cc'); }, { role: 'band' }), part(function (g) { buildBadge(g, 'cc', 1, true); }, { role: 'badge', cx: BADGE_R * Math.cos(GAMES.cc.ang), cy: BADGE_R * Math.sin(GAMES.cc.ang), rot: GAMES.cc.ang })], { order: 4, rv: 0 });
    layer('gears', -1 * GAP, buildGears().map(function (w) { return { geo: w.geo, cx: w.x || w.cx, cy: w.cy, ratio: w.ratio, role: 'gear' }; }), { order: 7, aA: 0.18 });
    layer('base', 0, [part(buildBase)], { order: 0 });
    layer('grid', 1 * GAP, [part(buildGrid)], { order: 1, aA: 0.55 });
    layer('frame', 2 * GAP, [part(buildFrame, { role: 'frame' })], { order: 2, rv: 0 });
    layer('arm', 3 * GAP, [part(buildArm, { role: 'arm' })], { order: 3 });
  } else {
    var GK = GAMES[GAME];
    layer('base', -0.9, [part(buildBase, { k: 1.0 })], { order: 0, aA: 0.32, aX: 0.5 });
    layer('ring', 0, [part(function (g) { GAMES[GAME] = { name: GK.name, motto: GK.motto, col: GK.col, hot: GK.hot, num: GK.num, r0: 1.06, r1: 1.16, teeth: GAME === 'sb' ? 120 : 0 }; buildRing(g, GAME); GAMES[GAME] = GK; }, { role: 'band' })], { order: 1 });
    layer('badge', 0.9, [part(function (g) { buildBadge(g, GAME, 3.25, false); }, { role: 'badge' })], { order: 2, rv: 0 });
    layer('gears', -1.8, buildGears().map(function (w) { return { geo: w.geo, cx: w.cx * 1.2 - 0.3, cy: w.cy * 1.2 - 0.2, ratio: w.ratio, role: 'gear', k: 1.2 }; }), { order: 3, aA: 0.0, aX: 0.6 });
  }
  if (root.getAttribute('data-astro-debug') !== null || /[?&]astrodebug\b/.test(location.search)) console.log('[astro] tier ' + tier + ', segments ' + SEGS + ', points ' + PTS + ', stars ' + STAR_COUNT);
  win.__astro = { tier: tier, segments: SEGS, points: PTS, stars: STAR_COUNT };

  /* ------------------------------------------------------------------ matrices (column-major, like OpenGL) */
  function persp(fovy, aspect, near, far, sx, sy) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, -sx, -sy, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, c, up) {
    var zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2], l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    var xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  }
  function model(x, y, z, rz, bx, k) {
    var c = Math.cos(rz), s = Math.sin(rz), cb = Math.cos(bx), sb = Math.sin(bx);
    return [c * k, s * cb * k, s * sb * k, 0, -s * k, c * cb * k, c * sb * k, 0, 0, -sb * k, cb * k, 0, x, y, z, 1];
  }
  function xform(m, x, y, z) {
    return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]];
  }

  /* ------------------------------------------------------------------ sizing */
  var CW = 0, CH = 0, VH = 0, dpr = 1, dprCap = LITE ? 1.25 : 2, bloom = !LITE, fbA = null, fbB = null, FW = 0, FH = 0;
  function makeFB(w, h) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    var f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return ok ? { f: f, t: t } : null;
  }
  var hud = doc.getElementById('astro-hud'), hctx = hud ? hud.getContext('2d') : null;
  var track = qs('[data-track]');
  function resize(force) {
    var w = win.innerWidth, h = win.innerHeight;
    if (!force && w === CW && Math.abs(h - CH) < h * 0.2) return;   // ignore the phone's address bar
    CW = w; CH = h;
    if (!VH || w !== resizeW || force) { VH = h; resizeW = w; }
    dpr = Math.min(win.devicePixelRatio || 1, dprCap);
    cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
    cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
    if (hctx) { hud.width = Math.round(CW * Math.min(dpr, 2)); hud.height = Math.round(CH * Math.min(dpr, 2)); hud.style.width = CW + 'px'; hud.style.height = CH + 'px'; hctx.setTransform(Math.min(dpr, 2), 0, 0, Math.min(dpr, 2), 0, 0); }
    [fbA, fbB].forEach(function (fb) { if (fb) { gl.deleteFramebuffer(fb.f); gl.deleteTexture(fb.t); } }); fbA = fbB = null;
    if (bloom) {
      FW = Math.max(2, Math.round(cv.width / 4)); FH = Math.max(2, Math.round(cv.height / 4));
      fbA = makeFB(FW, FH); fbB = makeFB(FW, FH); if (!fbA || !fbB) bloom = false;
    }
    if (track && ON) track.style.height = Math.round(TRACK * VH) + 'px';
    buildKeys();
    if (!ON) drawStill();
  }
  var resizeW = 0;

  /* ------------------------------------------------------------------ the scroll timeline (in screens of scroll) */
  var TRACK = MODE === 'home' ? 13.4 : 0;
  var portrait = false, KEYS = [];
  function lz(name) { return BYNAME[name] ? BYNAME[name].zx : 0; }
  function badgeXY(key) { var G = GAMES[key]; return [BADGE_R * Math.cos(G.ang), BADGE_R * Math.sin(G.ang)]; }
  function view(o) {   // fill in defaults for a camera key
    return { yaw: o.yaw || 0, pitch: o.pitch || 0, R: o.R || 2.2, wf: o.wf || 0.9, hf: o.hf || 0.9, sx: o.sx || 0, sy: o.sy || 0, t: o.t || [0, 0, 0] };
  }
  // wide layouts put the instrument on the right and the text on the left. At medium widths (a half-screen window, a
  // tablet) the two met, so any right-hand view is fitted into the space that is really left of the text: the instrument
  // shrinks and moves to the middle of that space and can never sit behind the hero text.
  var textRight = 0;
  function measureText() {
    var r = 0;
    if (MODE === 'home') { var c = qs('.stop[data-stop="hero"] .card'); if (c) r = c.getBoundingClientRect().right; }
    else qsa('.hero.game h1, .hero.game .lede, .hero.game .sub, .hero.game .eyebrow, .hero.game .pill').forEach(function (el) {
      var rg = doc.createRange(); rg.selectNodeContents(el); var b = rg.getBoundingClientRect(); if (b.width > 0) r = Math.max(r, b.right);
    });
    return r;
  }
  function fitRight(o) {
    if (portrait || !textRight || o.sx < 0.3) return o;
    var left = textRight + 28, W = CW - 24 - left;
    if (CW * (0.5 + o.sx / 2 - o.wf / 2) >= left) return o;   // already clear of the text (wide screens are untouched)
    var wf = Math.max(0.2, Math.min(o.wf, 0.84 * W / CW));   // the glow, plates and arm reach past the ring radius: keep a margin
    o.wf = wf; o.sx = 2 * (left + W / 2) / CW - 1;
    return o;
  }
  function buildKeys() {
    portrait = CW / CH < 0.9;
    var P = portrait;
    textRight = P ? 0 : measureText();
    if (MODE === 'home') {
      var hero = fitRight(view(P ? { R: 2.05, wf: 0.98, hf: 0.56, sy: 0.30 } : { R: 2.2, wf: 0.6, hf: 0.92, sx: 0.36 }));
      var ex = view(P ? { yaw: -0.95, pitch: 0.42, R: 2.7, wf: 1.0, hf: 0.62, sy: 0.18, t: [0, 0, -0.5] } : { yaw: -1.0, pitch: 0.34, R: 2.65, wf: 0.86, hf: 0.95, sx: 0.05, t: [0, 0, -0.5] });
      var orion = fitRight(view(P ? { yaw: -0.14, pitch: 0.08, R: 0.86, wf: 1.0, hf: 0.5, sy: 0.36, t: [0, 0, lz('frame')] } : { yaw: -0.16, pitch: 0.06, R: 0.88, wf: 0.5, hf: 0.92, sx: 0.42, t: [0, 0, lz('frame')] }));
      var arm = fitRight(view(P ? { yaw: -0.55, pitch: 0.45, R: 1.1, wf: 1, hf: 0.55, sy: 0.3, t: [0, 0, lz('arm')] } : { yaw: -0.55, pitch: 0.4, R: 1.1, wf: 0.58, hf: 0.9, sx: 0.32, t: [0, 0, lz('arm')] }));
      function badgeView(key, yaw) { var b = badgeXY(key); return fitRight(view(P ? { yaw: yaw, pitch: 0.1, R: 0.34, wf: 1, hf: 0.42, sy: 0.38, t: [b[0], b[1], lz(key)] } : { yaw: yaw, pitch: 0.08, R: 0.34, wf: 0.5, hf: 0.86, sx: 0.36, t: [b[0], b[1], lz(key)] })); }
      var close = view(P ? { R: 2.05, wf: 0.98, hf: 0.6, sy: 0.24, pitch: 0.12 } : { R: 2.2, wf: 0.78, hf: 0.88, sy: 0.05, pitch: 0.12 });
      KEYS = [[0, hero], [0.85, hero], [2.9, ex], [3.0, ex], [3.55, orion], [4.75, orion], [5.15, arm], [5.6, arm], [6.3, badgeView('cc', 0.2)], [7.4, badgeView('cc', 0.12)],
        [8.1, badgeView('ss', -0.2)], [9.1, badgeView('ss', -0.12)], [9.8, badgeView('sb', 0.18)], [10.8, badgeView('sb', 0.1)], [11.9, close], [99, close]];
    } else {
      var gh = fitRight(view(P ? { R: 1.35, wf: 1.0, hf: 0.56, sy: 0.32 } : { R: 1.3, wf: 0.6, hf: 0.9, sx: 0.36 }));
      var gx = view(P ? { yaw: -0.85, pitch: 0.4, R: 1.7, wf: 1.0, hf: 0.7, sy: 0.12 } : { yaw: -0.9, pitch: 0.34, R: 1.7, wf: 0.62, hf: 0.95, sx: 0.32 });
      var gb = view(P ? { yaw: 0.3, pitch: -0.2, R: 1.5, wf: 1, hf: 0.9 } : { yaw: 0.35, pitch: -0.18, R: 1.4, wf: 0.8, hf: 0.95, sx: 0.2 });
      var gp = qs('[data-gpin]'), g0 = 1, g1 = 2;
      if (gp) { var top = 0, el = gp; while (el) { top += el.offsetTop; el = el.offsetParent; } g0 = top / VH; g1 = (top + gp.offsetHeight) / VH - 1; }
      KEYS = [[0, gh], [Math.max(0.3, g0 - 0.6), gh], [g0 + (g1 - g0) * 0.55, gx], [g1, gx], [g1 + 1.2, gb], [999, gb]];
      GPIN = gp ? { el: gp, g0: g0, g1: g1, lines: qsa('.gline', gp) } : null;
    }
  }
  var GPIN = null;
  function camAt(s) {
    for (var i = 1; i < KEYS.length; i++) if (s <= KEYS[i][0]) {
      var a = KEYS[i - 1], b = KEYS[i], u = easeIO((s - a[0]) / Math.max(1e-6, b[0] - a[0])), A = a[1], B = b[1];
      return { yaw: lerp(A.yaw, B.yaw, u), pitch: lerp(A.pitch, B.pitch, u), R: lerp(A.R, B.R, u), wf: lerp(A.wf, B.wf, u), hf: lerp(A.hf, B.hf, u),
        sx: lerp(A.sx, B.sx, u), sy: lerp(A.sy, B.sy, u), t: [lerp(A.t[0], B.t[0], u), lerp(A.t[1], B.t[1], u), lerp(A.t[2], B.t[2], u)] };
    }
    return KEYS[KEYS.length - 1][1];
  }
  // when each layer moves apart and back (screens of scroll), in the order the parts are listed
  function explodeTarget(L, s) {
    if (MODE !== 'home') {
      if (!GPIN) return sstep(0.5, 1.6, s);
      return sstep(GPIN.g0 - 0.4, GPIN.g0 + (GPIN.g1 - GPIN.g0) * 0.5, s) * (1 - 0.6 * sstep(GPIN.g1, GPIN.g1 + 1.2, s));
    }
    var k = L.order, open = 0.95 + k * 0.22, shut = 10.95 + (7 - k) * 0.11;
    return sstep(open, open + 0.42, s) * (1 - sstep(shut, shut + 0.4, s));
  }
  // which layer a stop looks at (others dim so it reads clearly)
  var FOCI = MODE === 'home' ? [['frame', 3.2, 3.55, 4.75, 5.0], ['arm', 4.95, 5.15, 5.6, 5.85], ['cc', 5.85, 6.3, 7.4, 7.7], ['ss', 7.6, 8.1, 9.1, 9.4], ['sb', 9.3, 9.8, 10.8, 11.1]] : [];
  function focusOf(s) {
    for (var i = 0; i < FOCI.length; i++) { var f = FOCI[i]; var w = sstep(f[1], f[2], s) * (1 - sstep(f[3], f[4], s)); if (w > 0.001) return { name: f[0], w: w }; }
    return null;
  }

  /* ------------------------------------------------------------------ input */
  var mx = 0, my = 0, smx = 0, smy = 0, usedMouse = false, ptrX = -999, ptrY = -999;
  win.addEventListener('pointermove', function (e) {
    ptrX = e.clientX; ptrY = e.clientY;
    if (e.pointerType && e.pointerType !== 'mouse') return;
    usedMouse = true; mx = e.clientX / CW - 0.5; my = e.clientY / CH - 0.5;
  }, { passive: true });

  /* ------------------------------------------------------------------ sound (OFF until the visitor turns it on) */
  // SOUND SLOTS for Pep: drop files with exactly these names into /astro/sounds/ and they are used instead of the built-in tones.
  var SLOTS = { lock: '/astro/sounds/ring-lock.mp3', chime: '/astro/sounds/constellation-chime.mp3', nova: '/astro/sounds/supernova.mp3', dive: '/astro/sounds/dive.mp3' };
  var AC = null, soundOn = false, BUF = {}, lastSound = {};
  var sbtn = qs('[data-sound]');
  function loadSlots() {
    Object.keys(SLOTS).forEach(function (k) {
      if (BUF[k] !== undefined) return; BUF[k] = null;
      if (!win.fetch) return;
      fetch(SLOTS[k], { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(function (b) { return new Promise(function (res, rej) { AC.decodeAudioData(b, res, rej); }); })
        .then(function (buf) { BUF[k] = buf; }).catch(function () { BUF[k] = null; });
    });
  }
  function tone(freq, dur, type, vol, slide) {
    var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function play(k) {
    if (!soundOn || !AC) return;
    var now = performance.now(); if (lastSound[k] && now - lastSound[k] < 90) return; lastSound[k] = now;
    if (BUF[k]) { var s = AC.createBufferSource(); s.buffer = BUF[k]; var g = AC.createGain(); g.gain.value = 0.7; s.connect(g); g.connect(AC.destination); s.start(); return; }
    if (k === 'lock') { tone(2400, 0.035, 'square', 0.035); tone(900, 0.06, 'triangle', 0.05); }
    else if (k === 'chime') { [880, 1320, 1760].forEach(function (f, i) { setTimeout(function () { if (soundOn) tone(f, 1.1, 'sine', 0.05); }, i * 90); }); }
    else if (k === 'nova') { tone(220, 1.6, 'sawtooth', 0.04, 55); tone(1760, 1.2, 'sine', 0.04, 440); }
    else if (k === 'dive') { tone(300, 0.7, 'sine', 0.06, 1200); }
  }
  if (sbtn) {
    sbtn.hidden = !ON;
    sbtn.addEventListener('click', function () {
      soundOn = !soundOn;
      if (soundOn && !AC) { var C = win.AudioContext || win.webkitAudioContext; if (C) { AC = new C(); loadSlots(); } }
      if (AC && AC.state === 'suspended') AC.resume();
      sbtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      sbtn.querySelector('.st').textContent = soundOn ? 'Sound on' : 'Sound off';
      if (soundOn) play('lock');
    });
  }

  /* ------------------------------------------------------------------ DOM: stops (cards), leader labels, star names, tabs, dial */
  var STOPS = qsa('[data-stop]').map(function (el) {
    var w = (el.getAttribute('data-win') || '').split(',').map(Number);
    return { el: el, w: w, key: el.getAttribute('data-stop'), o: -1 };
  });
  var labelsBox = doc.getElementById('astro-labels');
  function mkLabel(cls, html) { var d = doc.createElement('div'); d.className = cls; d.innerHTML = html; labelsBox.appendChild(d); return d; }
  var LEADERS = [], NAMES = [], READ = [];
  if (labelsBox && MODE === 'home') {
    var countSeg = function (name) { var L = BYNAME[name]; var n = 0; L.parts.forEach(function (p) { n += p.buf.ln / 2; }); return n; };
    [['base', 205, 'Part 01 / Base plate', 'Real sky map * {' + STAR_COUNT + '} stars * J2000'],
     ['grid', 160, 'Part 02 / Sky grid plate', 'Lat 18^ N * {' + countSeg('grid') + '} engraved lines'],
     ['frame', 120, 'Part 03 / Star frame', 'Orion * {' + ORION.length + '} stars, cut in brass'],
     ['arm', 0, 'Part 04 / Pointer arm', 'Scale 0-90^ * {180} divisions'],
     ['cc', 155, 'Ring I / Cloud Chase', '{360} divisions * medallion I'],
     ['ss', 25, 'Ring II / Spell Shore', '{360} divisions * medallion II'],
     ['sb', 300, 'Ring III / Shaft Bound', '{120} gear teeth * medallion III'],
     ['gears', 330, 'Part 05 / Gear train', '3 wheels * {60} / 30 / 20 teeth']
    ].forEach(function (d) {
      var el = mkLabel('lbl', '<b></b><span></span>');
      var L = BYNAME[d[0]], r = d[0] === 'cc' || d[0] === 'ss' || d[0] === 'sb' ? GAMES[d[0]].r1 : d[0] === 'gears' ? 0.62 : d[0] === 'arm' ? 1.06 : d[0] === 'base' ? 1.075 : 0.86;
      LEADERS.push({ L: L, el: el, b: el.firstChild, sp: el.lastChild, ang: d[1] * DEG, r: r, t1: d[2], t2: d[3], prog: 0, shown: '', vis: 0 });
    });
    OR_NAMES.forEach(function (n) { NAMES.push({ i: n[0], el: mkLabel('sname', n[1]), side: n[2], vis: -1 }); });
    READ = [mkLabel('lbl rd', '<b>Bearing</b><span></span>'), mkLabel('lbl rd', '<b>Target</b><span>Betelgeuse / Alpha Orionis</span>')];
  }
  function fmtLabel(t, p) {   // numbers tick up while the label types in
    var plain = t.replace(/\{(\d+)\}/g, function (m, n) { return String(Math.round(+n * clamp(p * 1.4 - 0.2, 0, 1))); });
    plain = plain.replace(/\*/g, '\u00b7').replace(/\^/g, '\u00b0');
    var n = Math.floor(plain.length * clamp(p * 1.25, 0, 1));
    return plain.slice(0, n);
  }
  // the header gets its glass back once real text scrolls under it (past the instrument, or any scroll when it is a still picture)
  var bar = doc.getElementById('bar'), trackEl = qs('[data-track]');
  function barState() {
    if (!bar) return;
    var on = doc.documentElement.classList.contains('astro-on') && trackEl ? trackEl.getBoundingClientRect().bottom < 90 : (win.pageYOffset || 0) > 30;
    if (on !== bar.classList.contains('solid')) bar.classList.toggle('solid', on);
  }
  win.addEventListener('scroll', barState, { passive: true }); barState();
  // on a phone the four tabs do not all fit: the strip scrolls sideways, fades at whichever edge has more, and follows the active tab
  var tabNav = bar ? bar.querySelector('nav') : null;
  function tabFade() {
    if (!tabNav) return;
    var more = tabNav.scrollWidth - tabNav.clientWidth > 2;
    tabNav.classList.toggle('fade-r', more && tabNav.scrollLeft < tabNav.scrollWidth - tabNav.clientWidth - 2);
    tabNav.classList.toggle('fade-l', more && tabNav.scrollLeft > 2);
  }
  function keepTabVisible(t) {
    if (!tabNav || tabNav.scrollWidth - tabNav.clientWidth <= 2) return;
    var l = t.offsetLeft - 28, r = t.offsetLeft + t.offsetWidth + 28;
    if (l < tabNav.scrollLeft) tabNav.scrollLeft = Math.max(0, l);
    else if (r > tabNav.scrollLeft + tabNav.clientWidth) tabNav.scrollLeft = r - tabNav.clientWidth;
  }
  if (tabNav) { tabNav.addEventListener('scroll', tabFade, { passive: true }); win.addEventListener('resize', tabFade, { passive: true }); win.setTimeout(tabFade, 50); }
  var tabs = qsa('[data-tab]');
  var dial = qs('.dial-needle'), dialArc = qs('.dial-arc');

  /* ------------------------------------------------------------------ state */
  var t0 = performance.now(), last = t0, sv = MODE === 'home' ? scrollY() / Math.max(1, win.innerHeight) : 0, svPrev = sv, velS = 0;
  var tween = null, dive = null, nova = 0, novaT = -99, betClicks = [], flashEl = qs('.astro-flash');
  var frameSpin = 0, frameTurn = 0, ringSpin = { cc: 0, ss: 0, sb: 0 }, gearSpin = 0, armAng = 0.6, revealed = {}, chimed = {};
  var VP = null, PX = 1, camNow = null;
  var hot = [];   // canvas hotspots this frame: {x, y, r, kind, key}
  function stopLive(key) {   // is that stop's card the one on screen right now (lit, not fading, not dimmed by a fly)?
    for (var i = 0; i < STOPS.length; i++) if (STOPS[i].key === key) return STOPS[i].o > 0.5;
    return false;
  }
  // only a tap on empty sky may reach the 3D hit-test: never a card, text, button, header, footer or any other page element
  function isSkyTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    var tg = el.tagName;
    if (tg === 'HTML' || tg === 'BODY' || tg === 'CANVAS') return true;
    if (el.closest && el.closest('a,button,input,label,summary,header,footer,nav,.card,.after,.snd,.dial,h1,h2,h3,p,li,span,small,.pill,.chip,.btn')) return false;
    return !!(el.matches && el.matches('main,.track,.sky,.hero,.gpin,.gstage,.glines,#main'));
  }

  function layerModel(L, p, e) {
    // the layer's z moves from 0 (assembled) to its exploded place; during the load it flies in from in front
    var asm = L.asm, z = lerp(0.004 * L.order, L.zx, e);
    var fly = 1 - asm;
    z += fly * (3.2 + L.order * 0.55);
    var rz = (p.spin || 0) + fly * (L.order % 2 ? 1.4 : -1.4), bx = fly * (L.order % 2 ? 0.5 : -0.4);
    return model(p.cx, p.cy, z, rz, bx, p.k);
  }
  function wrapPi(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function computeSpins(dt, s, time) {
    var v = clamp(velS, -12, 12) * dt;   // screens moved this frame: gears and rings turn with scroll speed
    frameTurn = wrapPi(frameTurn + dt * 0.025 + v * 0.35);
    var up = 0;   // the star frame turns like the sky, and comes upright when Orion is being read
    if (MODE === 'home') up = sstep(3.0, 3.55, s) * (1 - sstep(4.75, 5.0, s));
    frameSpin = frameTurn * (1 - up);
    gearSpin += dt * 0.12 + v * 2.2;
    ringSpin.cc += dt * 0.01 + v * 0.6; ringSpin.ss -= dt * 0.008 + v * 0.45; ringSpin.sb += dt * 0.006 + v * 0.35;
    var armTarget = 0.6 + s * 0.35;
    if (MODE === 'home' && ORION_POS.length) {
      var b = ORION_POS[0], want = Math.atan2(b[1], b[0]) + frameSpin;
      var w = sstep(4.9, 5.25, s) * (1 - sstep(5.6, 5.9, s));
      armTarget = lerp(armTarget, armAng + wrapPi(want - armAng), w);
    }
    armAng += wrapPi(armTarget - armAng) * (1 - Math.exp(-dt * 5));
    LAYERS.forEach(function (L) {
      L.parts.forEach(function (p) {
        if (p.role === 'gear') p.spin = gearSpin * p.ratio * (MODE === 'home' ? 1 : 0.5);
        else if (p.role === 'frame') p.spin = frameSpin;
        else if (p.role === 'arm') p.spin = armAng;
        else if (p.role === 'band') p.spin = MODE === 'home' ? ringSpin[L.name] : ringSpin.cc;
        else if (p.role === 'badge') p.spin = MODE === 'home' ? 0 : 0.12 * Math.sin(time * 0.21);
      });
    });
  }

  /* ------------------------------------------------------------------ drawing */
  function drawScene(vp, pxScale, time, glowMul) {
    gl.blendFunc(gl.ONE, gl.ONE);
    for (var li = 0; li < LAYERS.length; li++) {
      var L = LAYERS[li]; if (L.alpha < 0.004) continue;
      for (var pi = 0; pi < L.parts.length; pi++) {
        var p = L.parts[pi], m = mul(vp, p.mm), gw = (1 + L.flash * 1.4) * glowMul;
        if (p.buf.ln) {
          gl.useProgram(LP); gl.bindBuffer(gl.ARRAY_BUFFER, p.buf.lb);
          gl.enableVertexAttribArray(LA.p); gl.vertexAttribPointer(LA.p, 3, gl.FLOAT, false, 32, 0);
          gl.enableVertexAttribArray(LA.c); gl.vertexAttribPointer(LA.c, 4, gl.FLOAT, false, 32, 12);
          gl.enableVertexAttribArray(LA.o); gl.vertexAttribPointer(LA.o, 1, gl.FLOAT, false, 32, 28);
          gl.uniformMatrix4fv(LU.m, false, m); gl.uniform1f(LU.al, L.alpha); gl.uniform1f(LU.rv, L.rv); gl.uniform1f(LU.gw, gw);
          gl.drawArrays(gl.LINES, 0, p.buf.ln);
          gl.disableVertexAttribArray(LA.p); gl.disableVertexAttribArray(LA.c); gl.disableVertexAttribArray(LA.o);
        }
        if (p.buf.pn) {
          gl.useProgram(PP); gl.bindBuffer(gl.ARRAY_BUFFER, p.buf.pb);
          gl.enableVertexAttribArray(PA.p); gl.vertexAttribPointer(PA.p, 3, gl.FLOAT, false, 40, 0);
          gl.enableVertexAttribArray(PA.c); gl.vertexAttribPointer(PA.c, 4, gl.FLOAT, false, 40, 12);
          gl.enableVertexAttribArray(PA.s); gl.vertexAttribPointer(PA.s, 3, gl.FLOAT, false, 40, 28);
          gl.uniformMatrix4fv(PU.m, false, m); gl.uniform1f(PU.al, L.alpha); gl.uniform1f(PU.rv, L.rv); gl.uniform1f(PU.gw, gw);
          gl.uniform1f(PU.tm, time); gl.uniform1f(PU.px, pxScale); gl.uniform1f(PU.nv, L.name === 'frame' ? nova : 0);
          gl.drawArrays(gl.POINTS, 0, p.buf.pn);
          gl.disableVertexAttribArray(PA.p); gl.disableVertexAttribArray(PA.c); gl.disableVertexAttribArray(PA.s);
        }
      }
    }
  }
  function fullQuad(P, A) { gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(A.p); gl.vertexAttribPointer(A.p, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disableVertexAttribArray(A.p); }
  function render(time) {
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
    var f = 1 / Math.tan(FOV / 2);
    if (bloom && fbA && fbB) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbA.f); gl.viewport(0, 0, FW, FH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      drawScene(VP, f * FH / 2 * 1.6, time, 1.0);
      gl.blendFunc(gl.ONE, gl.ZERO);
      gl.useProgram(BP); gl.uniform1i(BU.t, 0); gl.activeTexture(gl.TEXTURE0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbB.f); gl.bindTexture(gl.TEXTURE_2D, fbA.t); gl.uniform2f(BU.d, 1.6 / FW, 0); fullQuad(BP, BA);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbA.f); gl.bindTexture(gl.TEXTURE_2D, fbB.t); gl.uniform2f(BU.d, 0, 1.6 / FH); fullQuad(BP, BA);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    drawScene(VP, f * cv.height / 2, time, 1.0);
    if (bloom && fbA) {
      gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(AP); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fbA.t); gl.uniform1i(AU.t, 0); gl.uniform1f(AU.k, 1.15); fullQuad(AP, AA);
    }
  }
  var FOV = 34 * DEG;
  function setCamera(c, extraYaw, extraPitch, diveK) {
    var aspect = CW / CH, th = Math.tan(FOV / 2);
    var dist = c.R / (th * Math.min(aspect * c.wf, c.hf));
    if (diveK) dist *= lerp(1, 0.04, diveK);
    var yaw = c.yaw + extraYaw, pitch = c.pitch + extraPitch;
    var e = [c.t[0] + dist * Math.cos(pitch) * Math.sin(yaw), c.t[1] + dist * Math.sin(pitch), c.t[2] + dist * Math.cos(pitch) * Math.cos(yaw)];
    var P = persp(FOV, aspect, Math.max(0.01, dist * 0.05), dist * 6 + 12, c.sx * (diveK ? 1 - diveK : 1), c.sy * (diveK ? 1 - diveK : 1));
    VP = mul(P, lookAt(e, c.t, [0, 1, 0]));
    camNow = { dist: dist, eye: e };
  }
  function toScreen(m, x, y, z) {
    var q = xform(m, x, y, z); if (q[3] <= 0.0001) return null;
    return [(q[0] / q[3] * 0.5 + 0.5) * CW, (1 - (q[1] / q[3] * 0.5 + 0.5)) * CH, q[3]];
  }

  /* ------------------------------------------------------------------ one frame */
  var perfAcc = 0, perfN = 0, perfStage = 0, firstFrame = true;
  function frame(now) {
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    var time = (now - t0) / 1000;
    if (doc.hidden) { win.requestAnimationFrame(frame); return; }
    // scroll with a little weight
    if (tween) {
      var u = clamp((now - tween.t0) / tween.dur, 0, 1), y = lerp(tween.y0, tween.y1, easeIO(u));
      win.scrollTo(0, y); if (u >= 1) tween = null;
    }
    var sT = scrollY() / VH;
    sv += (sT - sv) * (1 - Math.exp(-dt * 7.5));
    if (Math.abs(sT - sv) < 0.0004) sv = sT;
    velS = lerp(velS, (sv - svPrev) / dt, 0.3); svPrev = sv;
    if (win.AstroSky) win.AstroSky.kick(velS * VH / 60 * 0.9);
    var s = sv;

    // load assembly and the per-layer springs (the tiny overshoot is the "click")
    LAYERS.forEach(function (L, i) {
      var delay = (MODE === 'home' ? [6, 5, 4, 7, 0, 1, 2, 3][i] : i) * 0.13 + 0.15;
      var at = time > delay ? 1 : 0;
      for (var k = 0; k < 2; k++) {
        var h = dt / 2;
        L.av += ((at - L.asm) * 120 - L.av * 13) * h; L.asm += L.av * h;
        L.ev += ((L.et - L.e) * 95 - L.ev * 10.5) * h; L.e += L.ev * h;
      }
      L.et = explodeTarget(L, s);
      if (!L.alock && at && Math.abs(1 - L.asm) < 0.02 && Math.abs(L.av) < 0.3) { L.alock = true; L.flash = 1; play('lock'); }
      // a part that has moved and settled at an end clicks into place (once per move)
      var end = L.et > 0.99 ? 1 : L.et < 0.01 ? 0 : -1;
      if (end >= 0 && L.alock && Math.abs(L.e - end) < 0.015 && Math.abs(L.ev) < 0.08 && L.lastLock !== end) {
        L.lastLock = end; L.flash = Math.max(L.flash, 0.8); play('lock');
      }
      L.flash *= Math.exp(-dt * 4);
    });

    // reveals: the frame's Orion and each medallion ignite at their stops, then stay lit
    if (MODE === 'home') {
      BYNAME.frame.rv = Math.max(BYNAME.frame.rv, sstep(3.4, 4.35, s));
      ['cc', 'ss', 'sb'].forEach(function (k, i) { var a = [6.0, 7.75, 9.45][i]; BYNAME[k].rv = Math.max(BYNAME[k].rv, sstep(a, a + 0.75, s)); });
    } else {
      BYNAME.badge.rv = Math.max(BYNAME.badge.rv, clamp((time - 1.6) / 2.2, 0, 1));
    }
    LAYERS.forEach(function (L) { if (L.rv >= 0.999 && !chimed[L.name] && (L.name === 'frame' || GAMES[L.name] || L.name === 'badge')) { chimed[L.name] = 1; L.flash = Math.max(L.flash, 0.6); play('chime'); } });

    computeSpins(dt, s, time);

    // camera: the scroll path, a slow turn, and a tilt toward the mouse (a drift of its own on phones)
    var c = camAt(s);
    if (dive) { var du = clamp((now - dive.t0) / 900, 0, 1); var dk = easeIO(du); c = { yaw: lerp(c.yaw, 0, dk), pitch: lerp(c.pitch, 0, dk), R: c.R, wf: c.wf, hf: c.hf, sx: c.sx, sy: c.sy, t: [lerp(c.t[0], dive.t[0], dk), lerp(c.t[1], dive.t[1], dk), lerp(c.t[2], dive.t[2], dk)] }; dive.k = dk; if (du >= 1 && !dive.gone) { dive.gone = true; location.href = dive.href; } }
    var heroW = MODE === 'home' ? 1 - sstep(0.5, 1.2, s) + sstep(11.6, 12.4, s) : 1 - sstep(0.4, 1.0, s) * 0.6;
    var gx = mx, gy = my;
    if (!usedMouse) { gx = 0.45 * Math.sin(time * 0.11); gy = 0.35 * Math.cos(time * 0.083); }
    smx += (gx - smx) * (1 - Math.exp(-dt * 3)); smy += (gy - smy) * (1 - Math.exp(-dt * 3));
    var sway = 0.16 * Math.sin(time * 0.17) * heroW;
    setCamera(c, sway + smx * 0.42 * (0.35 + 0.65 * heroW), -smy * 0.3 * (0.35 + 0.65 * heroW) + 0.04 * Math.sin(time * 0.13) * heroW, dive ? dive.k : 0);

    // layer alpha: assembled vs apart, the stop's focus, the page end
    var foc = focusOf(s), endFade = MODE === 'home' ? 1 - 0.72 * sstep(12.5, 13.6, s) : 1 - 0.68 * sstep(GPIN ? GPIN.g1 + 0.4 : 1.6, GPIN ? GPIN.g1 + 1.3 : 2.4, s);
    LAYERS.forEach(function (L) {
      var a = lerp(L.aA, L.aX, clamp(L.e, 0, 1));
      if (foc && foc.name !== L.name) a *= 1 - 0.8 * foc.w;
      a *= clamp(L.asm * 1.4, 0, 1) * endFade;
      L.alpha = a;
      L.parts.forEach(function (p) { p.mm = layerModel(L, p, L.e); });
    });

    render(time);
    hudFrame(s, time, foc, now);
    domFrame(s, time);

    // keep it smooth: if this device struggles, drop the glow, then resolution, then stars
    if (!firstFrame && time > 3) {
      perfAcc += dt; perfN++;
      if (perfN >= 90) {
        var avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
        if (avg > 0.024 && perfStage < 3) {
          perfStage++;
          if (perfStage === 1 && bloom) { bloom = false; }
          else if (dprCap > 1) { dprCap = Math.max(1, dprCap - 0.5); resize(true); }
        }
      }
    }
    firstFrame = false;
    win.requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ the overlay: leader lines, labels, star names, hotspots */
  function hudFrame(s, time, foc) {
    if (!hctx) return;
    hctx.clearRect(0, 0, CW, CH);
    hot = [];
    if (MODE === 'home') {
      // leader lines + engineering labels while the instrument is apart
      // callouts in two columns, like an engineering drawing: each part's anchor, an elbowed leader, a label that types in
      var lw = sstep(1.05, 1.5, s) * (1 - sstep(2.95, 3.25, s));
      var mid = toScreen(VP, 0, 0, -0.6), cols = { '-1': [], '1': [] };
      LEADERS.forEach(function (d) {
        var L = d.L, settle = clamp((L.e - 0.6) / 0.4, 0, 1), vis = lw * settle;
        d.cur = null;
        if (vis < 0.01) { if (d.vis !== 0) { d.el.style.opacity = '0'; d.vis = 0; } d.prog = Math.max(0, d.prog - 0.05); return; }
        var p0 = d.L.parts[0], la = d.ang - (p0.spin || 0);   // the anchor stays put on screen while the part turns
        var sp = toScreen(mul(VP, p0.mm), d.r * Math.cos(la), d.r * Math.sin(la), 0);
        if (!sp) return;
        var side = mid && sp[0] < mid[0] ? -1 : 1;
        d.cur = { sp: sp, side: side, vis: vis }; cols[side].push(d);
      });
      if (portrait) {
        // a phone has no room beside the instrument: half the callouts stack in a band above it, half below,
        // one line each, ordered so no leader crosses another (the higher a label, the further right its anchor)
        var all = cols['-1'].concat(cols['1']);
        if (all.length) {
          var minY = 1e9, maxY = -1e9;
          all.forEach(function (d) { minY = Math.min(minY, d.cur.sp[1]); maxY = Math.max(maxY, d.cur.sp[1]); });
          all.sort(function (a, b) { return a.cur.sp[0] - b.cur.sp[0]; });
          var half = Math.ceil(all.length / 2), g = 22;
          var upper = all.slice(0, half).sort(function (a, b) { return b.cur.sp[0] - a.cur.sp[0]; });
          var lower = all.slice(half).sort(function (a, b) { return b.cur.sp[0] - a.cur.sp[0]; });
          var uy = Math.max(104 + (upper.length - 1) * g, minY - 34) - (upper.length - 1) * g;
          upper.forEach(function (d, i) { d.cur.ly = uy + i * g; d.cur.side = -1; });
          var by = Math.min(maxY + 40, CH - 150 - (lower.length - 1) * g);
          lower.forEach(function (d, i) { d.cur.ly = by + i * g; d.cur.side = 1; });
          all.forEach(function (d) {
            var sp = d.cur.sp, ly = d.cur.ly, vis = d.cur.vis, side = d.cur.side;
            d.prog = Math.min(1, d.prog + 0.028);
            var tx1 = fmtLabel(d.t1, d.prog);
            if (tx1 + '|' !== d.shown) { d.b.textContent = tx1; d.sp.textContent = ''; d.shown = tx1 + '|'; }
            var ex = side < 0 ? 14 : CW - 14;
            hctx.strokeStyle = 'rgba(255,214,150,' + (0.5 * vis).toFixed(3) + ')'; hctx.lineWidth = 0.8;
            hctx.beginPath(); hctx.arc(sp[0], sp[1], 2.2, 0, 6.283); hctx.moveTo(sp[0], sp[1]);
            hctx.lineTo(sp[0], ly); hctx.lineTo(ex, ly); hctx.stroke();
            d.el.style.opacity = vis.toFixed(3);
            d.el.style.transform = 'translate3d(' + Math.round(ex) + 'px,' + Math.round(ly - 2) + 'px,0) translate(' + (side < 0 ? '0' : '-100%') + ',-100%)';
            d.el.classList.toggle('l', side > 0); d.vis = vis;
          });
        }
      } else
      [-1, 1].forEach(function (side) {
        var list = cols[side].sort(function (a, b) { return a.cur.sp[1] - b.cur.sp[1]; });
        var gapY = portrait ? 34 : 44, top = portrait ? 120 : 110, bot = CH - (portrait ? 90 : 80), y = top - gapY;
        list.forEach(function (d) { y = Math.max(d.cur.sp[1], y + gapY); d.cur.ly = y; });
        var over = y - bot; if (over > 0) list.forEach(function (d) { d.cur.ly -= over; });
        var lx = portrait ? (side < 0 ? 12 : CW - 12) : (side < 0 ? CW * 0.2 : CW * 0.8);
        list.forEach(function (d) {
          var sp = d.cur.sp, ly = d.cur.ly, vis = d.cur.vis, ex = lx + (side < 0 ? 8 : -8);
          if (portrait) ex = sp[0] + (side < 0 ? -18 : 18);
          d.prog = Math.min(1, d.prog + 0.028);
          hctx.strokeStyle = 'rgba(255,214,150,' + (0.55 * vis).toFixed(3) + ')'; hctx.lineWidth = 0.8;
          hctx.beginPath(); hctx.arc(sp[0], sp[1], 2.2, 0, 6.283); hctx.moveTo(sp[0], sp[1]);
          var kx = sp[0] + (ex - sp[0]) * 0.3;
          hctx.lineTo(kx, ly + (portrait ? 0 : 0)); hctx.lineTo(ex, ly); hctx.stroke();
          var txt1 = fmtLabel(d.t1, d.prog), txt2 = fmtLabel(d.t2, Math.max(0, d.prog - 0.15));
          if (txt1 + '|' + txt2 !== d.shown) { d.b.textContent = txt1; d.sp.textContent = txt2; d.shown = txt1 + '|' + txt2; }
          d.el.style.opacity = vis.toFixed(3);
          var px = portrait ? (side < 0 ? 12 : CW - 12) : lx, py = portrait ? ly - 2 : ly;
          d.el.style.transform = 'translate3d(' + Math.round(px) + 'px,' + Math.round(py) + 'px,0) translate(' + (side < 0 ? (portrait ? '0' : '-100%') : (portrait ? '-100%' : '0')) + ',' + (portrait ? '-100%' : '-50%') + ')';
          d.el.classList.toggle('l', portrait ? side > 0 : side < 0); d.vis = vis;
        });
      });
      // star names, placed like a star chart, once Orion has lit
      var fr = BYNAME.frame, nw = foc && foc.name === 'frame' ? foc.w * sstep(0.7, 1, fr.rv) : 0, fm = mul(VP, fr.parts[0].mm);
      NAMES.forEach(function (n) {
        if (nw < 0.01) { if (n.vis !== 0) { n.el.style.opacity = '0'; n.vis = 0; } return; }
        var p = ORION_POS[n.i], sp = toScreen(fm, p[0], p[1], 0); if (!sp) return;
        var dx = n.side * 14, dy = n.i === 6 || n.i === 7 ? 18 : -14;
        n.el.style.opacity = (nw * 0.85).toFixed(3);
        n.el.style.transform = 'translate3d(' + Math.round(sp[0] + dx) + 'px,' + Math.round(sp[1] + dy) + 'px,0) translate(' + (n.side < 0 ? '-100%' : n.side > 0 ? '0' : '-50%') + ',-50%)';
        n.vis = 1;
      });
      // the pointer arm's readout: bearing ticks as it swings
      var rw = foc && foc.name === 'arm' ? foc.w : 0;
      if (READ.length) {
        if (rw > 0.01) {
          var am = mul(VP, BYNAME.arm.parts[0].mm), tip = toScreen(am, 1.06, 0, 0);
          var deg = ((armAng / DEG) % 360 + 360) % 360;
          READ[0].lastChild.textContent = deg.toFixed(1) + '\u00b0';
          if (tip) {
            var bx = Math.min(CW - 170, Math.max(16, tip[0] + 18)), by = Math.min(CH - 60, Math.max(70, tip[1]));
            READ[0].style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0)'; READ[1].style.transform = 'translate3d(' + bx + 'px,' + (by + 36) + 'px,0)';
            hctx.strokeStyle = 'rgba(255,214,150,' + (0.5 * rw).toFixed(3) + ')'; hctx.beginPath(); hctx.moveTo(tip[0], tip[1]); hctx.lineTo(bx - 4, by); hctx.stroke();
          }
          READ[0].style.opacity = READ[1].style.opacity = rw.toFixed(3);
        } else if (READ[0].style.opacity !== '0') { READ[0].style.opacity = READ[1].style.opacity = '0'; }
      }
      // hotspots: the three medallions and Betelgeuse
      // a ring answers a tap only while ITS stop is the one on screen (not a ring drifting past, or off to the side)
      ['cc', 'ss', 'sb'].forEach(function (k) {
        var L = BYNAME[k]; if (L.alpha < 0.35 || !stopLive(k)) return;
        var bp = L.parts[1], m = mul(VP, bp.mm), cpt = toScreen(m, 0, 0, 0), ept = toScreen(m, 0.3, 0, 0);
        if (cpt && ept) hot.push({ x: cpt[0], y: cpt[1], r: Math.max(18, Math.hypot(ept[0] - cpt[0], ept[1] - cpt[1])), kind: 'game', key: k });
      });
      if (fr.alpha > 0.3 && stopLive('orion')) { var bt = ORION_POS[0], bs = toScreen(fm, bt[0], bt[1], 0); if (bs) hot.push({ x: bs[0], y: bs[1], r: 16, kind: 'bet' }); }
    } else {
      var bl = BYNAME.badge; if (bl.alpha > 0.3) { var m2 = mul(VP, bl.parts[0].mm), c2 = toScreen(m2, 0, 0, 0), e2 = toScreen(m2, 0.9, 0, 0); if (c2 && e2) hot.push({ x: c2[0], y: c2[1], r: Math.hypot(e2[0] - c2[0], e2[1] - c2[1]), kind: 'self' }); }
    }
    // supernova: the frame flares, then calms
    var nt = time - novaT;
    nova = nt < 0 ? 0 : nt < 0.35 ? nt / 0.35 : nt < 1.0 ? 1 : Math.max(0, 1 - (nt - 1.0) / 2.6);
    if (flashEl) { var fo = Math.max(nt < 0.5 && nt >= 0 ? (1 - nt / 0.5) * 0.35 : 0, dive ? dive.k * dive.k : 0); flashEl.style.opacity = fo.toFixed(3); }
  }

  /* ------------------------------------------------------------------ the DOM layer: cards, tabs, dial */
  function domFrame(s, time) {
    STOPS.forEach(function (st) {
      if (st.w.length < 4) return;
      var o = sstep(st.w[0], st.w[1], s) * (1 - sstep(st.w[2], st.w[3], s));
      if (tween && tween.stop && tween.stop !== st.key) o *= 0.15;
      if (Math.abs(o - st.o) < 0.004 && !(o === 0 && st.o !== 0)) return;
      st.o = o;
      st.el.style.opacity = o.toFixed(3);
      st.el.style.transform = 'translate3d(0,' + ((1 - o) * 26).toFixed(1) + 'px,0)';
      st.el.classList.toggle('live', o > 0.5);
    });
    if (GPIN && GPIN.lines.length) {
      var n = GPIN.lines.length, span = GPIN.g1 - GPIN.g0;
      GPIN.lines.forEach(function (ln, i) {
        // one line at a time: each owns its own slot of the pin and is fully gone before the next arrives
        var w = span * 0.94 / n, c = GPIN.g0 + span * 0.02 + i * w;
        var o = sstep(c, c + 0.28 * w, s) * (i === n - 1 ? 1 - sstep(GPIN.g1 + 0.3, GPIN.g1 + 0.7, s) : 1 - sstep(c + 0.72 * w, c + w, s));
        ln.style.opacity = o.toFixed(3); ln.style.transform = 'translate3d(0,' + ((1 - o) * 30).toFixed(1) + 'px,0) scale(' + (0.94 + 0.06 * o).toFixed(3) + ')';
      });
    }
    if (tabs.length) {
      var cur = null;
      var contact = doc.getElementById('contact');
      if (contact && contact.getBoundingClientRect().top < CH * 0.6) cur = 'contact';
      else if (s <= 5.9) cur = 'home'; else if (s > 5.9 && s < 7.75) cur = 'cc'; else if (s >= 7.75 && s < 9.45) cur = 'ss'; else if (s >= 9.45 && s < 11.2) cur = 'sb';
      tabs.forEach(function (t) { var on = t.getAttribute('data-tab') === cur; if (on !== t.classList.contains('on')) { t.classList.toggle('on', on); if (on) { t.setAttribute('aria-current', 'true'); keepTabVisible(t); } else t.removeAttribute('aria-current'); } });
    }
    if (dial) {
      var maxY = Math.max(1, root.scrollHeight - CH), pr = clamp(scrollY() / maxY, 0, 1);
      dial.setAttribute('transform', 'rotate(' + (pr * 360).toFixed(1) + ' 32 32)');
      if (dialArc) dialArc.setAttribute('stroke-dashoffset', (163.4 * (1 - pr)).toFixed(1));
    }
    if (finePointer) {   // the normal system cursor everywhere; it becomes the pointing hand over a ring that can be opened
      var hh = skyUnder ? hitTest(ptrX, ptrY) : null, cur = hh ? 'pointer' : '';
      if (cur !== curNow) { curNow = cur; body.style.cursor = cur; }
    }
  }
  var skyUnder = true, curNow = '';
  doc.addEventListener('pointerover', function (e) { skyUnder = isSkyTarget(e.target); }, { passive: true });
  // the constellation trail (trail.js) asks whether the mouse is over a ring that is live, to glow it like any other control
  win.AstroHot = function (x, y, el) { if (!isSkyTarget(el)) return null; var h = hitTest(x, y); return h ? { x: h.x, y: h.y, r: h.r } : null; };
  root.addEventListener('mouseleave', function () { ptrX = -999; }, { passive: true });

  function hitTest(x, y) {
    for (var i = 0; i < hot.length; i++) { var h = hot[i]; if ((h.x - x) * (h.x - x) + (h.y - y) * (h.y - y) < h.r * h.r) return h; }
    return null;
  }

  /* ------------------------------------------------------------------ actions: fly to a ring, dive into one, the supernova */
  function flyTo(y, stop) {
    if (reduce || !ON) { win.scrollTo(0, y); return; }
    var y0 = scrollY(), dist = Math.abs(y - y0) / VH;
    tween = { y0: y0, y1: y, t0: performance.now(), dur: clamp(700 + dist * 140, 800, 2200), stop: stop };
  }
  var STOPY = { cc: 6.85, ss: 8.6, sb: 10.3 };
  tabs.concat(qsa('[data-tab-link]')).forEach(function (t) {
    t.addEventListener('click', function (e) {
      var k = t.getAttribute('data-tab') || t.getAttribute('data-tab-link');
      if (!ON) return;   // without the animation the links simply jump to the section
      e.preventDefault();
      if (k === 'home') flyTo(0, 'hero');
      else if (k === 'contact') { var c = doc.getElementById('contact'); var top = 0, el = c; while (el) { top += el.offsetTop; el = el.offsetParent; } flyTo(top - 20, 'contact'); }
      else flyTo(STOPY[k] * VH, k);
    });
  });
  // the "orion lab studios" mark: on the home page it flies back to the very start (the same fly as the tabs);
  // on every other page it is a plain link to the home page, which opens at the top
  qsa('a.mark').forEach(function (m) {
    m.addEventListener('click', function (e) {
      if (!ON || MODE !== 'home' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (x) {} }
      flyTo(0, 'hero');
    });
  });
  // links from other pages (/#games, /#studio, /#cloudchase ...) land on the right part of the instrument:
  // those sections are pinned, so the browser's own jump cannot reach them
  if (MODE === 'home' && ON) {
    var HASHY = { games: 6.85, cloudchase: 6.85, spellshore: 8.6, shaftbound: 10.3, studio: 4.2 };
    var landHash = function () { var h = (location.hash || '').slice(1); if (HASHY[h] !== undefined) win.scrollTo(0, Math.round(HASHY[h] * VH)); };
    if (HASHY[(location.hash || '').slice(1)] !== undefined) { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; win.requestAnimationFrame(landHash); }
    win.addEventListener('hashchange', landHash);
  }
  function startDive(key, href) {
    if (!ON || reduce) { location.href = href; return; }
    var L = BYNAME[key], bp = L.parts[1], b = badgeXY(key);
    dive = { t0: performance.now(), href: href, k: 0, t: [b[0], b[1], bp.mm ? bp.mm[14] : L.zx] };
    if (flashEl) { flashEl.style.background = 'radial-gradient(circle at 50% 50%, rgba(' + GAMES[key].col.map(function (v) { return Math.round(v * 255); }).join(',') + ',0.9), rgba(5,6,10,1) 70%)'; }
    play('dive');
  }
  doc.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[data-dive]') : null;
    if (a && MODE === 'home') { e.preventDefault(); startDive(a.getAttribute('data-dive'), a.getAttribute('href')); return; }
    if (e.target.closest && e.target.closest('a,button,input,label,summary')) return;
    if (!isSkyTarget(e.target)) return;   // a tap on a card, text, header or footer is never a tap on the instrument behind it
    var h = hitTest(e.clientX, e.clientY);
    if (!h) return;
    if (h.kind === 'game') startDive(h.key, GAMES[h.key].href);
    else if (h.kind === 'bet') {
      var now = performance.now(); betClicks = betClicks.filter(function (t) { return now - t < 1600; }); betClicks.push(now);
      if (betClicks.length >= 3) { betClicks = []; novaT = (now - t0) / 1000; play('nova'); }
    } else if (h.kind === 'self') { BYNAME.badge.flash = 1; play('chime'); }
  });
  // iOS Safari sends no click at all for a tap on a plain element unless something inside the page (not the document)
  // listens for clicks there. Without this, a tap on the sky over a ring does nothing on an iPhone.
  qsa('main').forEach(function (m) { m.addEventListener('click', function () {}); });
  win.addEventListener('pageshow', function (e) { if (e.persisted) { dive = null; if (flashEl) flashEl.style.opacity = '0'; } });
  // keyboard: focusing something inside a stop brings that stop on screen
  doc.addEventListener('focusin', function (e) {
    if (!ON || MODE !== 'home') return;
    var st = e.target.closest ? e.target.closest('[data-stop]') : null; if (!st) return;
    var w = (st.getAttribute('data-win') || '').split(',').map(Number); if (w.length < 4) return;
    var mid = (w[1] + w[2]) / 2 * VH; if (Math.abs(scrollY() - mid) > VH * 0.3) win.scrollTo(0, mid);
  });

  /* ------------------------------------------------------------------ the still picture (reduce motion) */
  function drawStill() {
    LAYERS.forEach(function (L) { L.asm = 1; L.e = 0; L.rv = 1; L.alpha = L.aA * (MODE === 'home' ? 1 : 1); L.parts.forEach(function (p) { if (p.role === 'badge' && MODE === 'home') p.spin = 0; p.mm = layerModel(L, p, 0); }); });
    var c = KEYS.length ? KEYS[0][1] : view({});
    setCamera(c, -0.12, -0.06, 0);
    render(0);
    if (hctx) hctx.clearRect(0, 0, CW, CH);
  }

  resize(true);
  win.addEventListener('resize', function () { resize(false); }, { passive: true });
  if (ON) win.requestAnimationFrame(frame);
  else {
    // still mode: the sections read in normal order; the instrument is a calm, finished picture behind them
    drawStill();
  }
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); root.classList.remove('astro-on'); root.classList.add('astro-nogl'); });
})();
