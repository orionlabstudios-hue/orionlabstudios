# Branches: which is which

| Branch | What it is | When it moves |
|---|---|---|
| `main` | Exactly what is live. GitHub Pages publishes it. | Only when a release ships, by merging `next-build`. |
| `next-build` | Approved work waiting for the next release. | When a task merges in, after King's yes. |
| `task/<short-name>` | One job, cut from `next-build`. | While the job is worked on. |

`web1/new-domain` is the first name of `task/web1-new-domain` and points at the same commit. Use the `task/` name. It stays until King says it can be deleted.

## A job, start to finish

1. Cut the branch: `git switch -c task/<short-name> next-build`.
2. Do the work, commit, and push at the end of every session.
3. Run the link check, then show King the result and wait for his yes.
4. Merge into `next-build` and push.

## A release

1. Merge `next-build` into `main` and push. The site goes live within a few minutes.
2. Check the live site: every page loads over https, and the link check passes.
3. Check that internal files did not go public: `/CLAUDE.md`, `/START-HERE.md` and `/docs/BRANCHES.md` must all return 404.

## Never

Never force-push, rewrite history or delete a branch. Plain pushes only.
