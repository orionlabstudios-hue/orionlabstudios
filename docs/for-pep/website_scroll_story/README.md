# Website scroll story (13 Nov 2026) - for Pep

Branch `job/website-scroll-story`. Merged into `next-build` only. **Not on `main`, so not live**, until you or King say yes.

## The pictures and films (this folder)

| File | What it is |
|---|---|
| `home_phone_scroll.mp4` | The home page scrolled from top to bottom on a 390 x 844 phone screen (2x sharpness), 40 s. |
| `home_desktop_scroll.mp4` | The same at 1440 x 900, 40 s. |
| `home_phone_contact_sheet.jpg` / `home_desktop_contact_sheet.jpg` | 13 stills each, in scroll order. |
| `home_phone_01_hero.jpg` ... `home_phone_13_contact.jpg` | The 13 stills one by one (phone). |
| `home_desktop_01_hero.jpg` ... `home_desktop_13_contact.jpg` | The 13 stills one by one (computer). |
| `gamepages_phone_contact_sheet.jpg` / `gamepages_desktop_contact_sheet.jpg` | Cloud Chase, Spell Shore and Shaft Bound (one row each): hero, the three pinned lines, then the first content block. |

The films are made by Chrome (no phone in the loop): a script scrolls the page the way a visitor would, with short rests, and Chrome's own frames are encoded with ffmpeg. They are not a recording of a real phone.

## What it does (home page)

1. **Hero**: full screen, the title fades in. The mouse-follow stars stay (they now sit behind the whole page, not just the hero). On a phone, or with no mouse, they drift slowly by themselves. No motion permission is asked.
2. **Pinned Orion intro** (about 3.6 screens of scrolling): the scene stays in place and the scroll plays our app's intro: Orion's seven stars light one by one, the three belt stars fly out and draw **O L S**, a glow on completion, then the **ORION LAB STUDIOS** wordmark (Orbitron) and the gold lines grow in. The timings, star positions and letter paths are the numbers from the app's intro (`OlsIntro.cs`). **Scrolling back up plays it backwards** (checked: the same scroll position gives the identical picture going down and coming back).
3. **Five statement lines** that scale up and fade in as they enter and ease out as they leave. Our own words, taken from the site's existing text.
4. **Three full-screen game panels** (Cloud Chase, Spell Shore, Shaft Bound). Each slides up over the last, its scene zooms in, and the previous one dims and sinks back. Text and our own CSS shapes only, no screenshots.
5. Studio, promise, contact and the footer are as before (footer byte-for-byte unchanged).

## What it does (game pages)

Same system, so the site is homogeneous: the same star sky behind the page, a full-screen hero whose title fades in, then a **pinned scene** (the game's own CSS shapes zooming slowly) that says three lines as you scroll, then the page's existing content blocks, which now rise into view as you reach them. Every original content block on the three game pages is unchanged word for word (checked by script).

## What changed (files)

- New: `story.css`, `story.js` (shared by the home page and the three game pages), `fonts/Orbitron-Medium-latin.ttf` + `fonts/OFL-Orbitron.txt`.
- Changed: `index.html`, `cloudchase/index.html`, `spellshore/index.html`, `shaftbound/index.html`. On the game pages only the head link, the body class, the star canvas, the hero's old CSS stars, the new pinned scene and the script tag were added or removed.
- **Not touched**: every privacy, terms, delete-data, legal, accessibility, support and parents page; `studio.css`; the legal text and the Casper address (checked: still on `/legal/` and every privacy policy). No phone number, no "San Juan", no "5.99" or "3.99" anywhere (checked over all 26 files).

## Libraries and licences

**No library.** Plain CSS and plain JavaScript (about 380 lines), no network calls, no cookies, nothing stored.
The one file added from outside the site is the **Orbitron Medium** font (the one our app's intro uses), under the **SIL Open Font License 1.1**, free for commercial use. Its licence text is in `fonts/OFL-Orbitron.txt`. Nothing is copied from apple.com: no text, pictures, code, measurements or fonts.

## Quality checks (all run on the local copy)

- **Layout jumps**: Chrome's layout-shift score 0 to 0.002 over load plus a full scroll, on all four pages, phone and computer.
- **Sideways scrolling**: none on any of the four pages at 390 or 1440 wide.
- **Smoothness**: only `transform` and `opacity` move; the glows are pre-drawn pictures, no blur filters. Chrome with the processor slowed 4 times (a stand-in for a weak phone) still got a new frame every 4.2 ms (95th percentile 4.3 ms; worst single frame 8 to 17 ms) while the whole page was scrolled in 4 s. (A test browser without a screen, so this proves the work per frame is small, not that a real phone shows 60 fps. Please look on a real phone.)
- **Reduce motion**: with it on, nothing is pinned or animated by scrolling: the intro shows its finished picture, statements and panels are plain stacked sections, the stars are still, everything is readable.
- **No JavaScript / script fails to load**: every text is still there and readable, nothing stays invisible.
- **Browsers**: Chrome (checked, all pages, both sizes) and WebKit (the engine under Safari: home and Cloud Chase checked, same picture, no errors).
- **Links**: 415 internal links and files checked, none broken.

## What I could not do

- **Firefox was not run**: the Firefox build on this PC is blocked from starting here. The code uses only standard features (sticky, canvas, IntersectionObserver, CSS variables) that Firefox supports, but please open it once in Firefox.
- **No real iPhone or Android** was used, and WebKit here is Playwright's Windows build, not Safari itself. A real phone check is still to do (especially the smoothness and the address bar sliding in and out).
- **Font**: you wrote that our font is Orbitron. The site's text has always been Cormorant Garamond and Barlow, and Orbitron was not on the site. I used **Orbitron where the app uses it** (the wordmark and the small labels) and kept the site's own fonts for the big lines, so nothing existing changed. Easy to flip if you want Orbitron on the big statements too.
- The film is Chrome-made, not a phone recording (see above).
- Two of the game pages (Spell Shore, Shaft Bound) have no favicon, so the browser logs a 404 for `/favicon.ico`. That was already so and I left it.

## How it is built (for whoever works on it next)

- `story.js` runs one loop. Each frame it draws the stars, then reads the scroll position and updates only what is near the screen.
- The intro is one canvas drawn in the app's own 1080 x 1920 numbers, scaled to fit under the header. Scroll position is turned into the app's clock (0 to 4.4 s) and the picture is a pure function of that time, which is why it plays backwards for free. The animation ends at 80 % of the pinned section and the rest is a calm hold.
- A new game page needs: `class="story"` on `<body>`, `<canvas id="sky">`, `story.css` after its own styles, `story.js` last, and a `<section class="gpin" data-gpin>` with a `.pscene`, `.glines` and three `.gline`.
- The three CSS scenes are copied into `story.css` from `studio.css` so the game pages (which do not load `studio.css`) can use them. If a scene changes, change both.
- `docs/` is excluded from the live site (`_config.yml`), so this folder is not public.
