/* Orion Lab Studios - the top bar (the same bar on every page).
   Plain JavaScript, no libraries, no cookies, no network calls. The bar works without this file (they are plain links);
   this only adds three comforts:
   - the bar turns solid once text scrolls under it;
   - a row of tabs that does not fit (a phone) scrolls sideways, fades at whichever edge has more, and brings the
     highlighted tab into view; the same for a game's second row of links;
   - --bar-h on <html> is the bar's real height, so a page can keep its first line clear of it. */
(function () {
  'use strict';
  var win = window, doc = document, root = doc.documentElement;
  var bar = doc.getElementById('bar');
  if (!bar) return;
  var track = doc.querySelector('[data-track]');   // the home page's pinned scroll: the bar stays clear until it is over
  function solid() {
    var on = root.classList.contains('astro-on') && track ? track.getBoundingClientRect().bottom < 90 : (win.pageYOffset || root.scrollTop || 0) > 30;
    if (on !== bar.classList.contains('solid')) bar.classList.toggle('solid', on);
  }
  var rows = Array.prototype.slice.call(bar.querySelectorAll('nav'));
  function fade(n) {
    var more = n.scrollWidth - n.clientWidth > 2;
    n.classList.toggle('fade-r', more && n.scrollLeft < n.scrollWidth - n.clientWidth - 2);
    n.classList.toggle('fade-l', more && n.scrollLeft > 2);
  }
  function keep(n, t) {   // bring link t fully into view inside its row n
    if (!n || !t || n.scrollWidth - n.clientWidth <= 2) return;
    var nr = n.getBoundingClientRect(), tr = t.getBoundingClientRect(), pad = 24;
    if (tr.left < nr.left + pad) n.scrollLeft = Math.max(0, n.scrollLeft - (nr.left + pad - tr.left));
    else if (tr.right > nr.right - pad) n.scrollLeft += tr.right - (nr.right - pad);
    fade(n);
  }
  function height() { root.style.setProperty('--bar-h', bar.offsetHeight + 'px'); }
  function all() {
    height();
    rows.forEach(function (n) { fade(n); var cur = n.querySelector('a.on, a[aria-current]'); if (cur) keep(n, cur); });
  }
  rows.forEach(function (n) { n.addEventListener('scroll', function () { fade(n); }, { passive: true }); });
  win.addEventListener('scroll', solid, { passive: true });
  win.addEventListener('resize', all, { passive: true });
  win.addEventListener('load', all);
  solid(); all(); win.setTimeout(all, 60);
  if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) doc.fonts.ready.then(all);
  // astro.js (home page) highlights tabs as the camera flies and asks for the lit one to be kept in view
  win.AstroBar = { keep: function (t) { keep(t && t.closest ? t.closest('nav') : null, t); }, solid: solid };
})();
