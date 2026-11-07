# START HERE: Orion Lab Studios website

Read this page first, and open other files only when a task needs them.

## What this repo is

The studio website at https://orionlabstudio.com: plain HTML served by GitHub Pages from `main`, with no build step. It holds the home page and the privacy, terms, support and delete-data pages for Cloud Chase, Spell Shore and Shaft Bound.

## Where the task list is

`C:\CC\Cloud Chase Prototype\_OneShot_incoming\NEXT.md`, under Open jobs. The current report is `WEB1_REPORT.md` in the same folder.

## Where things live

| Path | What is in it |
|---|---|
| `index.html`, `404.html`, `studio.css` | Home page, not-found page, shared styles for the studio pages. |
| `privacy/`, `terms/`, `legal/`, `accessibility/` | The website's own legal pages. |
| `cloudchase/`, `spellshore/`, `shaftbound/` | Each game's page and its privacy, terms, support and delete-data pages. Spell Shore and Shaft Bound also have `parents/`. |
| `fonts/` | Self-hosted fonts and their licences. |
| `CNAME` | The custom domain. Do not edit by hand. |
| `_config.yml` | Keeps internal files (`CLAUDE.md`, `START-HERE.md`, `docs/`, `tools/`) off the live site. Add any new internal file to it. |
| `tools/linkcheck.py` | The release check: links, plus text that must be on no page. |
| `docs/BRANCHES.md` | Which branch is which. |

## Branches

- `main` = exactly what is live. Anything on `main` is public at once. It moves only when a release ships.
- `next-build` = approved work waiting for the next release.
- `task/<short-name>` = one job, cut from `next-build`. It merges after King's yes.
- Plain pushes only.

## Testing

There is nothing to build.

1. Run `python tools/linkcheck.py`. Every internal link must pass, and it prints its counts as ratios. This PC has no Python on its path, so use `"C:\Program Files\Blender Foundation\Blender 5.2\5.2\python\bin\python.exe" -I tools/linkcheck.py`.
2. It refuses a tree that still holds `%%RELEASE_DAY%%`, the stand-in for a "Last updated" date. Replace it with the real day on the release day.
3. After a release, check that every page loads over https on the live site, and that `/CLAUDE.md`, `/START-HERE.md` and `/docs/BRANCHES.md` return 404.

## Always

- The public email is `support@orionlabstudio.com`. `admin@orionlabstudio.com` is never published.
- Legal text changes only with King's yes. The attorney decides the wording.
- King does the clicks at Bizee, Namecheap and GitHub settings. Never ask for or type a password.
- `app-ads.txt` stays a placeholder (comments only, no seller lines) until our AdMob and Kidoz accounts exist.
