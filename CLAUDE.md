# Orion Lab Studios website: rules for Claude Code

**Read `START-HERE.md` first.**

The studio website at https://orionlabstudio.com, served by GitHub Pages from `main`, including the privacy, terms and delete-data pages for the games.

## Branches

- `main` = exactly what is live. Anything on `main` is public at once. It moves only when a release ships.
- `next-build` = approved work waiting for the next release.
- `task/<short-name>` = one branch per job, cut from `next-build`. It merges into `next-build` only after King's yes.
- `next-build` merges into `main` only when a release ships.
- Plain pushes only. Never force-push, never rewrite history, and nothing gets deleted.
- Push at the end of every session.

More detail is in `docs/BRANCHES.md`.

## Always

- The public email is `support@orionlabstudio.com`. `admin@orionlabstudio.com` never goes on the website.
- Legal text changes need King's yes, and the exact wording of legal pages is the attorney's call.
- No passwords, keys or secrets in this repo.
- Internal files such as this one stay off the live site: `_config.yml` excludes them. Add any new internal file to its list.
- Ask King before anything that deletes or overwrites.
- Line endings: this repo needs `git config core.autocrlf false` on Windows, so that files stay exactly as they are.
