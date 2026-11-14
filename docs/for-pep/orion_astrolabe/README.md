# The Orion Astrolabe: new home page and the three game pages

Branch `job/orion-astrolabe`, merged into `next-build`. **Not on `main`, so not live.** It goes live only with King's or Pep's yes.

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
  - **2,887 real stars** in their real places.
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

- **Source:** the Yale Bright Star Catalogue, 5th Revised Edition (Hoffleit & Warren 1991), CDS VizieR catalogue V/50.
- **How it got here:** taken from Cloud Chase's `Assets/Resources/Sky/StarCatalog.txt`, which was converted from the CDS file.
- **What the page uses:** the 2,887 stars of magnitude 5.5 or brighter, packed into `astro/stars.js`. The 23 Orion figure stars were each matched to the catalogue within 0.004°.
- **Licence: NOT CONFIRMED.** Cloud Chase's file calls it public domain. I could not confirm that from an actual licence statement.
  - It is a NASA/ADC-era catalogue that CDS distributes freely, and it is used everywhere with a credit line, but I found no document that says "public domain" in so many words.
  - The page credits it on the base plate ("YALE BRIGHT STAR CATALOGUE") and in the header of `stars.js`.
  - If King or Pep want certainty, the alternative is the HYG database, which is CC BY-SA 4.0: free to use with credit. It can be swapped in with one script run (`mkstars.py`).

## Left out on purpose (until King or Pep confirm)

- **"Made for every phone":** removed from the home page.
- **The Instagram buttons:**
  - removed from the home page's contact section
  - removed from the Cloud Chase page's hero and its "Coming soon" section
- **What was NOT touched, because it is policy wording:**
  - The Instagram row in the studio Legal page's table stays. Changing legal text needs King's yes.
  - The Cloud Chase "Coming soon" section still says "Follow along for the launch date." with no link under it now. Worth a look.
- **"Kid-safe by design / COPPA / GDPR-K":** removed from the home page promise.
  - The privacy policies of Spell Shore and Shaft Bound still mention COPPA, because that is their legal wording and was not changed.
- **No phone number anywhere** (checked). The LLC line is on all 23 pages. The Casper address is where it was (legal page and the privacy policies).

## Claims to check (not verified by me)

- **"Eighty-one levels"** (home page and Cloud Chase page): the game has 81 level slots, but I have not confirmed all 81 have finished content.
- **Spell Shore and Shaft Bound descriptions:** not checked against the games. Those repos are paused or off-limits to me, so I could not open them.
- **Cloud Chase page:**
  - "Cloud Duel ... (16+)"
  - "Nine movements"
  - "Play anywhere ... offline"

  These are the page's existing words, kept as they were and not re-verified.

## Quality checks

| Check | Result |
|---|---|
| Chrome at 1440 and 390 (phone emulation), every page | No console errors, no sideways scrolling, layout shift 0.0002 or less on the home page. |
| Safari's engine (WebKit, Playwright's build) at 1440 and 390 | Home page and Spell Shore render with no errors. |
| **Firefox** | **Not tested.** Firefox cannot run on this PC, so it needs one look on a real computer. |
| **Real Safari on an iPhone or Mac** | **Not tested** either. WebKit is the same engine but not the same browser. |
| Reduce motion | A still, finished astrolabe behind the text, normal scrolling, no hint to scroll it apart. |
| No JavaScript | All content readable in normal order; the sound button and dial are hidden. |
| Old or slow phones | Lighter version chosen automatically (low memory or few cores, or `?lite`): 1,100 stars, no bloom, lower sharpness. It also steps down by itself if frames run slow. |
| Links | 494 local links on 23 pages, 0 broken. The checker was proven to catch a broken link and a missing anchor. |

`story.css` and `story.js` (the previous design) are no longer used by any page. They were left in the repo rather than deleted, per the repo's rule: ask before deleting.
