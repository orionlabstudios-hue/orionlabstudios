# The Orion Astrolabe: new home page and the three game pages

Built on branch `job/orion-astrolabe`. **Live on `main` since 13 Nov (Pep's yes).** The phone fixes and the constellation trail (branch `job/astrolabe-phone-fixes`) went to `main` on 14 Nov with King's yes. The site is at orionlabstudio.com.

## Phone fixes and the constellation trail (14 Nov)

Branch `job/astrolabe-phone-fixes`. What changed:

1. **Phone buttons work.** A stop (a card of the home page) is a full-screen layer. The cards of hidden stops were still taking taps, so they covered the buttons of the stop on screen. Now only the card of the stop that is on screen takes taps; the stop layers themselves, their wrappers and every hidden card let taps through (`astro/astro.css`).
2. **"See our worlds" no longer dives into a game.** A tap may reach the 3D hit-test only when it lands on empty sky. A tap on a card, text, a button area, the header or the footer never does (`isSkyTarget` in `astro/astro.js`). A ring answers a tap only while its own stop is the one on screen, and Betelgeuse only while the Orion stop is on screen (`stopLive`). "See our worlds" flies to the Cloud Chase ring with the same smooth fly as the Cloud Chase tab.
3. **Home.** The "orion lab studios" mark flies back to the very start on the home page (same fly as the tabs) and opens the home page at the top from the policy pages. A "Home" tab is now the first tab on every page (23 pages). On the game pages and their small pages the top left is the game's own name (it opens that game's page), so there the new Home tab is the way back; I did not replace the game names with the studio mark.
4. **Medium widths.** Any view that puts the instrument on the right is now fitted into the space that is really left of the text, so it shrinks and moves and never sits behind the hero text (home and the three game pages). Between about 700 and 1100 wide the text column is a little narrower and has a soft dark wash behind it. Below 1000 wide the tabs sit on their own row under the name.
5. **Phone tab row.** Five tabs (Home, Cloud Chase, Spell Shore, Shaft Bound, Contact). The row scrolls sideways with a fade at whichever edge has more, the last tab scrolls fully clear of the edge, and the active tab scrolls into view. A width bug made the row 40 px too narrow at the right; fixed.
6. **`story.css` and `story.js` deleted** from the site root (King's yes). Nothing referenced them: the only mention outside `docs/` was a comment inside `story.css` itself.
7. **The reticle cursor is gone** (element, CSS and JavaScript). The normal system cursor is back everywhere, with the pointing hand on links and buttons as usual, and over a ring that can be opened.
8. **The constellation trail** (`astro/trail.js`, loaded on every page; computers only). Moving the mouse drops a tiny warm-white star every 60 to 90 px, joined to the one before by a thin faint line; at most 8 stars, each fading in under 2 s with a slight drift; the newest star twinkles once when the mouse stops; over a link, button, tab or a live ring the newest three stars drift toward it and its edge gets a soft gold glow; a click throws 6 to 10 specks of stardust that are gone in about half a second. It is one canvas with `pointer-events:none` at z-index 9, above the page and below every header, so it cannot take a click. It only listens to real mouse events (never touch), does nothing with "reduce motion" on, draws only while something is alive and clears only the part of the canvas it used.

Test results for this round are in "Quality checks" at the end.

## Changes after review (13 Nov)

1. **Star data** swapped from the Yale catalogue to the HYG Database (CC BY-SA 4.0). Credit added on the Legal notice page and in the home page footer; licence note beside `astro/stars.js`. Details below.
2. **Cloud Chase page:** "Follow along for the launch date." is now "Launch date coming soon." (no link).
3. **Phone top bar:** the full "orion lab studios" now shows. The four tabs do not all fit at 390 wide, so the strip scrolls sideways with a soft fade at whichever edge has more, and it follows the active tab (checked at 390 and 360 wide, in Chrome and WebKit).
4. **"Eighty-one levels"** dropped from the home page's Cloud Chase text (see "Claims to check" for the two places it still stands on the Cloud Chase page).
5. **Two small fixes found while re-checking:** the top bar now turns solid once you are past the instrument (footer text was showing through it), and the footer has room at the bottom so the fixed sound button no longer sits on the last line of fine print.
6. Left as they were: the Spell Shore parents wording, the COPPA mentions and the Legal page table.
7. **One thing for the lawyer's list, not changed:** the Legal notice's font credit names Cormorant Garamond, Barlow, Cinzel and Poppins, but the site now also uses Orbitron (same SIL Open Font License) and no stylesheet or page loads Cinzel or Poppins any more (the only places those names still appear are the Legal notice's credit line and the Spell Shore terms page text).

`home_phone_390.mp4` and the phone and home stills were re-made from this build. `home_desktop_1440.mp4` and `spellshore_desktop_1440.mp4` are from before this round (they look the same apart from the star count and the top bar).

## Files in this folder

| File | What it shows |
|---|---|
| `home_desktop_1440.mp4` | The full home page scroll at 1440 x 900, 44 s: the instrument assembles itself, comes apart, Orion, the pointer arm, the three game rings, closes up, then the promise and contact. |
| `home_phone_390.mp4` | The same on a 390 x 844 phone screen (2x sharpness), 44 s. |
| `spellshore_desktop_1440.mp4` | The Spell Shore page scrolled top to bottom, 19 s (the other two game pages work the same way). |
| `screenshots/home_desktop_*.jpg`, `screenshots/home_phone_*.jpg` | Each stop of the home page. The number is how many screens down: `top`, `2p6v` exploded view, `4p2v` Orion, `5p4v` pointer arm, `6p85v` Cloud Chase ring, `8p6v` Spell Shore ring, `10p3v` Shaft Bound ring, `12p3v` closed again, `13p6v` the promise. |
| `screenshots/<game>_desktop_*.jpg`, `screenshots/<game>_phone_*.jpg` | Each game page: `top` is its hero, `2p0v` is its three-line pinned section. |
| `screenshots/doc_spellshore_privacy_desktop_top.jpg` | A policy page in the new style. |
| `screenshots/home_reduce_motion_desktop_top.jpg` | The home page with "reduce motion" switched on: a still astrolabe and normal scrolling. |

## What was built

**Home page, the Orion Astrolabe.** One brass star instrument drawn entirely in code, in real 3D, with about 22,000 fine glowing lines. No pictures of any kind.
- **Load:** the parts fly in and click into place in about 2 seconds. The mouse-follow background stars from the old page are kept.
- **Hero:** the whole instrument turns slowly and leans toward the mouse; on a phone it drifts by itself. It carries:
  - 720 rim ticks, engraved degree numbers and Roman hour numerals
  - the sky grid, the ecliptic and a gear train
  - **2,865 real stars** in their real places.
- **Scroll = exploded view:** eight parts separate one by one along the 3D axis, with leader lines and small technical labels that type in while their numbers count up:
  - base plate (the real sky map)
  - sky grid plate
  - star frame
  - pointer arm
  - gear train
  - one ring per game
  On a phone the labels stack in two tidy bands above and below the instrument.
- **Orion:** the frame comes upright and lights star by star.
  - Betelgeuse is the biggest star, deep orange and breathing.
  - Rigel is blue-white.
  - The club, shield and sword are drawn, with a pink Orion Nebula.
  - The star names appear, beside the studio text "Three stars, one straight line."
- **The pointer arm** swings onto Betelgeuse and shows its bearing.
- **One engraved ring per game,** each in its game's colour with its own constellation:
  - Cloud Chase: a cloud
  - Spell Shore: an island with a palm and a sun
  - Shaft Bound: a pickaxe
  Each ring has the exact name, tagline, description, tags and button text from the current home page.
- **Game tabs at the top** (Cloud Chase, Spell Shore, Shaft Bound, Contact): clicking one flies the camera to that ring, and the active tab lights up in the game's colour.
- **Clicking a ring's medallion or its button** dives the camera into it with a flash of the game's colour, then opens that game's page.
- **End:** everything closes back into the full astrolabe, then the players-and-parents promise, contact, and the full footer. The footer has every game's privacy, terms, support, delete-your-data and for-parents links, the studio legal pages, and "© 2026 Orion Lab Studios LLC, a Wyoming limited liability company." It is the old footer, unchanged.
- **Feel:**
  - smooth weighted scroll
  - spring overshoot when parts settle
  - gears and rings turn with scroll speed
  - fast scrolling streaks the stars
- **Small extras:**
  - a glowing reticle cursor that snaps to clickable things (computers only)
  - a tiny astrolabe dial in the corner showing page progress
  - Easter egg: click Betelgeuse 3 times quickly and it flares like a supernova, then calms down.
- **Sound** is OFF by default, with a small "Sound off" button. There are four named, empty slots for Pep in `/astro/sounds/`:
  - `ring-lock.mp3`
  - `constellation-chime.mp3`
  - `supernova.mp3`
  - `dive.mp3`

  `astro/sounds/README.txt` explains them. Until files are dropped in, the page plays tiny tones it makes itself. Nothing is downloaded.
- **Links from other pages** (`/#games`, `/#studio`, `/#cloudchase`, `/#promise`, `/#contact`) land on the right part of the instrument (checked: 4.2, 6.85, 10.3 and 13.4 screens).

**Game pages** (`/cloudchase/`, `/spellshore/`, `/shaftbound/`). Everything on them is kept: every section, every sentence, every link, except the Instagram buttons (see below).
- Each page has its own sky in the game's colour (aura and star tint).
- Its hero is the game's own ring and constellation from the home instrument.
- The old CSS-drawn picture inside the three-line pinned section is replaced by the 3D ring coming apart.
- The three lines now show one at a time.

**Policy, support, legal, parents and 404 pages (19 pages).** Restyled only:
- the game's coloured sky behind them
- a dark glass reading sheet
- an engraved scale under each title

**The wording is untouched, and this was checked by machine.** The visible text of every page, with all markup stripped, is byte-identical before and after. The check was first proven to go red on a one-word change. The only line removed from each file is its `<body>` tag, rewritten with the sky attributes.

## Libraries and licences

- **No libraries.** The 3D is plain WebGL written for this site. No Three.js, no GSAP, and no request to any other website.
- **Fonts, all already in `/fonts` and all under the SIL Open Font License:**
  - Cormorant Garamond
  - Barlow
  - Orbitron
- No analytics, no trackers, no cookies, and nothing stored in the browser (checked: no cookie, localStorage, sessionStorage or IndexedDB use). The only request the page code makes is for the four sound files on our own site, and only after a visitor switches sound on.
- Everything is drawn in code: no AI images, no AI video, no images of any kind on these pages.

## Star catalogue and its licence

**Swapped on 13 Nov to the HYG Database, so the licence is now certain.** (Before that it was the Yale Bright Star Catalogue, whose licence I could not confirm.)

- **Source:** the HYG Database v4.1 by astronexus, file `hyg/CURRENT/hygdata_v41.csv` (33,932,548 bytes) from https://github.com/astronexus/HYG-Database. The repo's own LICENSE file says: "This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License." That repo is now archived; the README says new versions are on codeberg.org/astronexus/hyg, which I did not open.
- **What the page uses:** the 2,865 stars of magnitude 5.5 or brighter (it was 2,887 from Yale), packed into `astro/stars.js`. All 23 Orion figure stars matched their named star in HYG within 0.004° (Betelgeuse, Rigel, Alnitak and so on, read off the match table).
- **How to redo it:** `tools/mkstars_hyg.py <hygdata_v41.csv> <stars.js>`, in this folder.
- **Credit, as the licence requires:**
  - The Legal notice page, under "Credits and licences": names the HYG Database and astronexus, links the licence, says what we changed, and says `astro/stars.js` is shared under the same licence.
  - A small line in the home page footer: "Star data: HYG database, CC BY-SA 4.0" (the first words link to the Legal notice credit, the licence name links to the licence).
  - The header of `astro/stars.js` carries the same notice, and `astro/STAR-DATA-LICENCE.txt` sits beside it.
  - The engraving on the base plate now reads "HYG DATABASE * CC BY-SA 4.0".
- **Scope of the share-alike:** I wrote that the licence covers the star data file only, not the rest of the website. That is my reading and a lawyer should confirm it.
- **The Yale file** is no longer used anywhere. Cloud Chase's own `StarCatalog.txt` was only read and not changed.

## Left out on purpose (until King or Pep confirm)

- **"Made for every phone":** removed from the home page.
- **The Instagram buttons:**
  - removed from the home page's contact section
  - removed from the Cloud Chase page's hero and its "Coming soon" section
- **What was NOT touched, because it is policy wording:**
  - The Instagram row in the studio Legal page's table stays. Changing legal text needs King's yes.
  - The Cloud Chase "Coming soon" section now says "Launch date coming soon." with no link (changed 13 Nov).
- **"Kid-safe by design / COPPA / GDPR-K":** removed from the home page promise.
  - The privacy policies of Spell Shore and Shaft Bound still mention COPPA, because that is their legal wording and was not changed.
- **No phone number anywhere** (checked). The LLC line is on all 23 pages. The Casper address is where it was (legal page and the privacy policies).

## Claims to check (not verified by me)

- **"Eighty-one levels":** removed from the home page on 13 Nov, which now reads "A story runner set on an impossible road above a drowned world. One girl, and a sky that remembers." **It is still on the Cloud Chase page, twice:** the pinned line "Eighty-one levels, from the first temple to the last tower." and the same words as the heading of the "Nine movements" section (the nine movements themselves are a separate claim). The job named only the home line with its exact new wording, so I left those two alone. Tell me the wording you want and I will change them.
- **Spell Shore and Shaft Bound descriptions:** not checked against the games. Those repos are paused or off-limits to me, so I could not open them.
- **Cloud Chase page:**
  - "Cloud Duel ... (16+)"
  - "Nine movements"
  - "Play anywhere ... offline"

  These are the page's existing words, kept as they were and not re-verified.

## Quality checks

| Check | Result |
|---|---|
| Chrome at 1440 and 390 (phone emulation), every page (re-run 13 Nov) | No console errors, no sideways scrolling, layout shift 0.0032 or less on the home page. |
| Safari's engine (WebKit, Playwright's build) at 1440 and 390 (re-run 13 Nov) | Home page, Cloud Chase page and Legal notice render with no errors. |
| **Firefox** | **Not tested.** Firefox cannot run on this PC, so it needs one look on a real computer. |
| **Real Safari on an iPhone or Mac** | **Not tested** either. WebKit is the same engine but not the same browser. |
| Reduce motion | A still, finished astrolabe behind the text, normal scrolling, no hint to scroll it apart. |
| No JavaScript | All content readable in normal order; the sound button and dial are hidden. |
| Old or slow phones | Lighter version chosen automatically (low memory or few cores, or `?lite`): 1,100 stars, no bloom, lower sharpness. It also steps down by itself if frames run slow. |
| Links (re-run 13 Nov) | 497 local links on 23 pages, 0 broken. The checker was proven to catch a broken link and a missing anchor. |
| Visible text of the 19 policy pages (re-run 13 Nov, against the last commit) | 18 identical. The Legal notice changed by one pure insertion, the star-data credit paragraph, and nothing else. Home page and Cloud Chase page differ only by the edits below. |

`story.css` and `story.js` (the previous design) were deleted on 14 Nov with King's yes, after checking that no page referenced them.

### Checks for the phone fixes and the trail (14 Nov, on the final code)

The scripts are in `tools/` (`touch_test.mjs`, `tabrow_test.mjs`, `trail_test.mjs`). They drive a real browser with real touch taps on an emulated iPhone 13 (390 wide, touch screen) and real mouse moves on a desktop window.

| Check | Result |
|---|---|
| The bug reproduced first, on the live site as it was (old code) | The same test FAILED there: the tap point of "See our worlds" was covered by the Shaft Bound stop's `DIV.card`. So the test does catch the bug. |
| Touch test, Chrome, iPhone 13 emulation | 113 of 113 passed |
| Touch test, WebKit (the Safari engine), iPhone 13 emulation | 113 of 113 passed |
| Phone tab row at 390, 360 and 768 wide, Chrome and WebKit | 24 of 24 in each: five tabs with Home first; Home active and fully visible at the start; the last tab ends 20 px clear of the edge (18 px at 360); every tapped tab becomes active and is fully on screen |
| Constellation trail, 23 pages at 1440 and 1024 wide (Chrome) | 46 of 46: the trail draws, fades to nothing, the click burst appears and is gone; the canvas has `pointer-events:none` at z 9 under each header (z 10, 20 or 50); the cursor is the system one (arrow on the page, hand on links); no reticle; a hovered link gets the gold edge and loses it |
| Trail: never more than 8 stars | most seen at once: 8 |
| Trail: touch screen | no canvas, no glow after 12 taps |
| Trail: reduce motion | no canvas, no glow |
| Trail: frame time at 1440 x 900 (this PC's display runs above 200 fps) | policy page: 210 fps with the mouse still, 218 fps while drawing the trail (median 4.2 ms both). Home page: 225 fps and 225 fps (median 4.2 ms both) |
| Links | 544 local links on 23 pages, 0 broken |
| Visible text against the last commit | every one of the 23 pages differs by one thing only: the word "Home" added to the header's tab row (5 characters each). Nothing else on any policy page changed |
| Chrome at 1440, 1024, 768 and 390 wide; WebKit at the same four | home, Cloud Chase and a policy page: no console errors or warnings, no sideways scroll |
| Reduce motion | home at 390 and Cloud Chase at 1024: no errors |

Found while testing, not part of the job:

- **iPhone ring taps.** Safari on an iPhone sends no click at all for a tap on a plain part of the page unless something inside the page listens for clicks there, so a tap on the sky over a ring did nothing in the Safari engine (before this job too). Fixed with a listener on `main`; the rings now open in WebKit as well.
- **No icon on 12 pages.** The Spell Shore and Shaft Bound pages (the game page and its small pages, 6 each) have no icon link, so the browser asks for `/favicon.ico` and gets a 404. Not changed.
- **Sound slots.** Turning sound on asks for the four sound files in `astro/sounds/`, which are still empty, so the browser logs four 404s once. Expected until Pep adds the files.
